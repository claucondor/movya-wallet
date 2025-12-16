import { ActionResultSystemPrompt } from '../openrouter/ActionResultSystemPrompt';
import { WalletAssistantSystemPrompt } from '../openrouter/prompts';
import { GeminiService } from '../gemini/service';
import RecipientResolver from './recipientResolver';
import PriceService from '../services/priceService';

// Define interfaces for clarity
export interface ChatAction {
    type: 'button' | 'link' | 'transaction_link';
    label: string;
    value: string;
    style?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
    url?: string; // Para links externos
}

export interface RichContent {
    type: 'transaction_details' | 'balance_info' | 'contact_info';
    data: {
        transactionHash?: string;
        amount?: string;
        currency?: string;
        usdValue?: string;
        recipient?: string;
        recipientNickname?: string;
        explorerUrl?: string;
        balance?: string;
        tokens?: Array<{ symbol: string; balance: string; usdValue: string }>;
    };
}

export interface AIResponse {
    action: 'SEND' | 'CHECK_BALANCE' | 'VIEW_HISTORY' | 'SWAP' | 'ADD_CONTACT' | 'CLARIFY' | 'GREETING' | 'ERROR' | string; // Allow string for potential flexibility/errors
    parameters: {
        recipientEmail: string | null;
        recipientAddress: string | null;
        amount: number | string | null;
        currency: string | null; // Also used as nickname for ADD_CONTACT
        fromCurrency: string | null; // For SWAP: source currency
        toCurrency: string | null;   // For SWAP: target currency
    } | null;
    confirmationRequired: boolean;
    confirmationMessage: string | null;
    responseMessage: string;
    // Nuevos campos para elementos interactivos
    quickActions?: ChatAction[];
    richContent?: RichContent;
    expectsResponse?: boolean; // Si espera una respuesta específica del usuario
}

export interface AgentServiceResponse {
    responseMessage: string;
    newState: AIResponse | null; // The state passed between turns is the AI's response structure
    actionDetails: {
        type: 'SEND_TRANSACTION' | 'FETCH_BALANCE' | 'FETCH_HISTORY' | 'SWAP' | 'ADD_CONTACT' | null;
        recipientAddress: string | null; // Explicitly allow null
        recipientEmail: string | null;   // Explicitly allow null
        amount: string | null;           // Explicitly allow null
        currency: string | null;         // Explicitly allow null (also nickname for ADD_CONTACT)
        fromCurrency: string | null;     // For SWAP: source currency
        toCurrency: string | null;       // For SWAP: target currency
    } | null;
}

interface ActionResultInput {
    actionType: 'SEND_TRANSACTION' | 'FETCH_BALANCE' | 'FETCH_HISTORY' | 'SWAP';
    status: 'success' | 'failure';
    data: {
        transactionHash?: string;
        amountSent?: string;
        currencySent?: string;
        recipient?: string;
        balance?: string;
        history?: { date: string; type: 'sent' | 'received'; amount: string; recipientOrSender: string }[];
        errorCode?: string;
        errorMessage?: string;
    };
    userId?: string; // Añadir userId como campo opcional
}

export class AgentService {
    private geminiService: GeminiService;

    constructor(apiKey: string | undefined) {
        if (!apiKey) {
            throw new Error("Gemini API key is missing. Please set GOOGLE_AI_API_KEY environment variable.");
        }
        this.geminiService = new GeminiService({ apiKey });
    }

    /**
     * Processes a user's message using Gemini AI and prepares a response for the frontend.
     *
     * @param {string} currentUserMessage - The latest message from the user.
     * @param {AIResponse | null} currentState - The state object returned by the AI in the previous turn.
     * @param {string} userId - The ID of the user for resolving contacts and recipients.
     * @param {string} network - The network the user is on ('mainnet' or 'testnet').
     * @returns {Promise<AgentServiceResponse>}
     *          - responseMessage: The message to display to the user.
     *          - newState: The state object to be stored by the frontend for the next turn.
     *          - actionDetails: If an action needs frontend execution (e.g., SEND), this contains the parameters.
     */
    async processMessage(currentUserMessage: string, currentState: AIResponse | null, userId: string, network: 'mainnet' | 'testnet' = 'mainnet'): Promise<AgentServiceResponse> {
        // Restore the check for empty messages *before* calling the AI
        if (!currentUserMessage) {
            console.log('Empty message received, returning predefined response.');
            return {
                responseMessage: "Please provide a message.",
                newState: currentState, // Keep previous state if any
                actionDetails: null
            };
        }

        console.log('Processing message with state:', { currentUserMessage, currentState, network });
        const inputJson = {
            currentUserMessage,
            currentState,
            network // Include network in the input to the AI
        };

        try {
            // Build dynamic system prompt with network context and real-time prices
            const networkContext = network === 'testnet'
                ? '\n\n**CURRENT NETWORK: TESTNET** - User is on testnet. ONLY STX is available. NO sBTC, NO aUSD, NO SWAPS. If user asks about these, explain they are only on mainnet.'
                : '\n\n**CURRENT NETWORK: MAINNET** - User is on mainnet. All currencies (STX, sBTC, aUSD, ALEX) and SWAPS via ALEX DEX are available.';

            // Fetch real-time prices for the prompt
            let priceContext = '';
            try {
                const [stxPrice, sbtcPrice, alexPrice] = await Promise.all([
                    PriceService.getTokenPrice('STX'),
                    PriceService.getTokenPrice('sBTC'),
                    PriceService.getTokenPrice('ALEX')
                ]);
                priceContext = `\n\n**REAL-TIME PRICES (use these for USD estimates):**
- STX: $${stxPrice?.price.toFixed(4) || '0.28'}
- sBTC: $${sbtcPrice?.price.toFixed(2) || '87000'}
- aUSD: $1.00 (stablecoin)
- ALEX: $${alexPrice?.price.toFixed(6) || '0.0015'}`;
                console.log('[AgentService] Injected real-time prices into prompt:', priceContext);
            } catch (priceError) {
                console.warn('[AgentService] Failed to fetch prices for prompt, using defaults:', priceError);
                priceContext = '\n\n**PRICES:** Use aUSD as reference ($1). Do not estimate other token USD values.';
            }

            const dynamicPrompt = WalletAssistantSystemPrompt + networkContext + priceContext;

            // Call chat with user message and the specific system prompt
            const responseJsonString = await this.geminiService.chat(
                JSON.stringify(inputJson), // User message is the JSON input
                dynamicPrompt // System prompt with network context
            );
            const aiResponse: AIResponse = JSON.parse(responseJsonString);
            console.log('AI Raw Response:', responseJsonString);
            console.log('AI Parsed Response:', aiResponse);

            // SAFETY NET: Si el usuario está confirmando una acción SWAP/SEND y Gemini perdió los parámetros,
            // restaurarlos desde el currentState
            if (currentState && currentState.confirmationRequired && !aiResponse.confirmationRequired) {
                const isConfirmation = currentUserMessage.toLowerCase().match(/^(yes|sí|si|confirm|confirmar|ok|okay|do it|hazlo|dale)/);

                if (isConfirmation) {
                    console.log('[SAFETY NET] Detected confirmation. Checking if parameters were lost...');

                    // Si la acción es la misma pero los parámetros están null, restaurar desde currentState
                    if (aiResponse.action === currentState.action && aiResponse.parameters) {
                        const hasNullParams = (
                            (currentState.action === 'SWAP' &&
                             (!aiResponse.parameters.fromCurrency || !aiResponse.parameters.toCurrency)) ||
                            (currentState.action === 'SEND' &&
                             (!aiResponse.parameters.amount || !aiResponse.parameters.currency))
                        );

                        if (hasNullParams && currentState.parameters) {
                            console.log('[SAFETY NET] Parameters were lost! Restoring from currentState:', currentState.parameters);
                            aiResponse.parameters = {
                                ...aiResponse.parameters,
                                ...currentState.parameters
                            };
                        }
                    }
                }
            }

            // Validate and enrich response with price information
            await this.validateAndEnrichResponse(aiResponse);

            // NETWORK MISMATCH CHECK: Detect if user provides address for wrong network
            if (aiResponse.parameters?.recipientAddress && (aiResponse.action === 'SEND' || aiResponse.action === 'ADD_CONTACT')) {
                const address = aiResponse.parameters.recipientAddress;
                const isMainnetAddress = address.startsWith('SP');
                const isTestnetAddress = address.startsWith('ST');

                if (network === 'testnet' && isMainnetAddress) {
                    console.log(`[NETWORK MISMATCH] User is on testnet but provided mainnet address: ${address}`);
                    aiResponse.action = 'ERROR';
                    aiResponse.confirmationRequired = false;
                    aiResponse.responseMessage = `¡Ojo! Estás en testnet pero esa dirección (${address.substring(0, 8)}...) es de mainnet (empieza con SP). Las direcciones de testnet empiezan con ST. ¿Podrías darme una dirección de testnet?`;
                } else if (network === 'mainnet' && isTestnetAddress) {
                    console.log(`[NETWORK MISMATCH] User is on mainnet but provided testnet address: ${address}`);
                    aiResponse.action = 'ERROR';
                    aiResponse.confirmationRequired = false;
                    aiResponse.responseMessage = `¡Ojo! Estás en mainnet pero esa dirección (${address.substring(0, 8)}...) es de testnet (empieza con ST). Las direcciones de mainnet empiezan con SP. ¿Podrías darme una dirección de mainnet?`;
                }
            }

            // SAFETY NET: Detect ADD_CONTACT intent from user message even if Gemini returned CLARIFY
            const addContactKeywords = /\b(add|save|store|guardar?|agregar|añadir)\b.*\b(contact|contacto|email|address|dirección)\b|\b(contact|contacto)\b.*\b(add|save|guardar|agregar)\b/i;
            const looksLikeAddContact = addContactKeywords.test(currentUserMessage);

            if (looksLikeAddContact && aiResponse.action === 'CLARIFY' && aiResponse.parameters) {
                // Check if we have enough info to execute ADD_CONTACT
                const hasEmail = aiResponse.parameters.recipientEmail && aiResponse.parameters.recipientEmail.includes('@');
                const hasAddress = aiResponse.parameters.recipientAddress && /^(SP|ST)[A-Z0-9]{38,41}$/.test(aiResponse.parameters.recipientAddress);

                // Try to extract nickname from the user message
                const nicknameMatch = currentUserMessage.match(/\b(?:as|como|called|llamado)\s+["']?([a-zA-Z]+)["']?/i) ||
                                     currentUserMessage.match(/["']([a-zA-Z]+)["']\s+(?:with|con|to my contacts)/i);
                const extractedNickname = nicknameMatch ? nicknameMatch[1] : null;

                if ((hasEmail || hasAddress) && extractedNickname) {
                    console.log(`[SAFETY NET] Detected ADD_CONTACT intent. Upgrading from CLARIFY to ADD_CONTACT`);
                    console.log(`[SAFETY NET] Email: ${aiResponse.parameters.recipientEmail}, Address: ${aiResponse.parameters.recipientAddress}, Nickname: ${extractedNickname}`);

                    aiResponse.action = 'ADD_CONTACT';
                    aiResponse.parameters.currency = extractedNickname; // nickname goes in currency field
                    aiResponse.confirmationRequired = false;
                    aiResponse.responseMessage = `Guardando a ${extractedNickname} en tus contactos...`;
                }
            }

            // MODIFICACIÓN: Intentar resolver el destinatario incluso para acciones CLARIFY
            // si recipientEmail está presente pero recipientAddress no
            if (aiResponse.parameters &&
                aiResponse.parameters.recipientEmail &&
                !aiResponse.parameters.recipientAddress &&
                (aiResponse.action === 'SEND' || aiResponse.action === 'CLARIFY')) {
                
                console.log(`Attempting to resolve recipient from email/nickname: ${aiResponse.parameters.recipientEmail}`);
                await this.resolveRecipient(aiResponse, userId, network);
                
                // Si estamos en CLARIFY y pudimos resolver el destinatario,
                // podríamos considerar cambiar a SEND si tenemos todos los demás parámetros
                if (aiResponse.action === 'CLARIFY' && 
                    aiResponse.parameters.recipientAddress && 
                    aiResponse.parameters.amount && 
                    aiResponse.parameters.currency) {
                    
                    console.log(`Successfully resolved ${aiResponse.parameters.recipientEmail} to ${aiResponse.parameters.recipientAddress}. Upgrading action from CLARIFY to SEND.`);
                    
                    // Cambiar de CLARIFY a SEND con confirmación requerida
                    aiResponse.action = 'SEND';
                    aiResponse.confirmationRequired = true;
                    
                    // Actualizar los mensajes para reflejar el cambio
                    const originalRecipient = aiResponse.parameters.recipientEmail;
                    aiResponse.confirmationMessage = `¡Encontré a ${originalRecipient} en tus contactos! ¿Quieres enviar ${aiResponse.parameters.amount} ${aiResponse.parameters.currency} a ${originalRecipient} (${aiResponse.parameters.recipientAddress})?`;
                    aiResponse.responseMessage = `Por favor confirma los detalles para enviar ${aiResponse.parameters.amount} ${aiResponse.parameters.currency} a ${originalRecipient}.`;
                }
            }

            // El código existente para SEND sin confirmación requerida
            // (Esto podría ser redundante ahora para algunos casos, pero lo mantenemos como salvaguarda)
            if (aiResponse.action === 'SEND' && !aiResponse.confirmationRequired && aiResponse.parameters) {
                // Resolver nickname/email a dirección de wallet si es necesario
                await this.resolveRecipient(aiResponse, userId, network);
            }

            let actionDetails: AgentServiceResponse['actionDetails'] = null;

            if (aiResponse.action === 'SEND' && !aiResponse.confirmationRequired && aiResponse.parameters) {
                actionDetails = {
                    type: 'SEND_TRANSACTION',
                    recipientAddress: aiResponse.parameters.recipientAddress,
                    recipientEmail: aiResponse.parameters.recipientEmail,
                    amount: aiResponse.parameters.amount !== null && aiResponse.parameters.amount !== undefined
                        ? String(aiResponse.parameters.amount)
                        : null,
                    currency: aiResponse.parameters.currency,
                    fromCurrency: null,
                    toCurrency: null
                };
            } else if (aiResponse.action === 'SWAP' && !aiResponse.confirmationRequired && aiResponse.parameters) {
                actionDetails = {
                    type: 'SWAP',
                    recipientAddress: null,
                    recipientEmail: null,
                    amount: aiResponse.parameters.amount !== null && aiResponse.parameters.amount !== undefined
                        ? String(aiResponse.parameters.amount)
                        : null,
                    currency: null,
                    fromCurrency: aiResponse.parameters.fromCurrency,
                    toCurrency: aiResponse.parameters.toCurrency
                };
            } else if (aiResponse.action === 'CHECK_BALANCE') {
                actionDetails = { 
                    type: 'FETCH_BALANCE', 
                    recipientAddress: null, 
                    recipientEmail: null, 
                    amount: null, 
                    currency: null,
                    fromCurrency: null,
                    toCurrency: null
                };
            } else if (aiResponse.action === 'VIEW_HISTORY') {
                actionDetails = {
                    type: 'FETCH_HISTORY',
                    recipientAddress: null,
                    recipientEmail: null,
                    amount: null,
                    currency: null,
                    fromCurrency: null,
                    toCurrency: null
                };
            } else if (aiResponse.action === 'ADD_CONTACT' && aiResponse.parameters) {
                // ADD_CONTACT: currency field contains the nickname
                actionDetails = {
                    type: 'ADD_CONTACT',
                    recipientAddress: aiResponse.parameters.recipientAddress,
                    recipientEmail: aiResponse.parameters.recipientEmail,
                    amount: null,
                    currency: aiResponse.parameters.currency, // This is the nickname
                    fromCurrency: null,
                    toCurrency: null
                };
            }

            // Generar elementos interactivos para la respuesta inicial
            this.generateInteractiveElements(aiResponse, currentUserMessage);

            let finalResponseMessage = aiResponse.responseMessage;
            if (aiResponse.confirmationRequired && aiResponse.confirmationMessage) {
                finalResponseMessage = `${aiResponse.confirmationMessage}\n\n${aiResponse.responseMessage}`;
            }

            return {
                responseMessage: finalResponseMessage,
                newState: aiResponse,
                actionDetails: actionDetails
            };
        } catch (error) {
            console.error('Error processing message with Gemini:', error);
            return {
                responseMessage: "Sorry, I encountered an error trying to understand that. Please try again.",
                newState: null,
                actionDetails: null
            };
        }
    }

    /**
     * Validate currency support and enrich response with price information
     * @param aiResponse - AI response to validate and enrich
     */
    private async validateAndEnrichResponse(aiResponse: AIResponse): Promise<void> {
        if (!aiResponse.parameters) return;

        const { currency, amount } = aiResponse.parameters;

        // Validate currency support
        if (currency && !PriceService.isCurrencySupported(currency)) {
            console.log(`Unsupported currency detected: ${currency}`);
            aiResponse.action = 'ERROR';
            aiResponse.responseMessage = `Sorry, I only support STX, sBTC, aUSD, and ALEX transactions. ${currency} is not supported on this wallet.`;
            aiResponse.confirmationRequired = false;
            aiResponse.confirmationMessage = null;
            return;
        }

        // Add USD value information for clarity
        if (currency && amount && typeof amount === 'number' && aiResponse.action === 'SEND') {
            try {
                const usdValue = await PriceService.calculateUSDValue(currency, amount);
                const formattedAmount = PriceService.formatCurrencyAmount(amount, currency);
                const formattedUSD = PriceService.formatUSDAmount(usdValue);

                // Enrich confirmation message with USD equivalent
                if (aiResponse.confirmationRequired && aiResponse.confirmationMessage) {
                    aiResponse.confirmationMessage = aiResponse.confirmationMessage.replace(
                        new RegExp(`${amount}\\s*${currency}`, 'i'),
                        `${formattedAmount} (≈ ${formattedUSD})`
                    );
                }

                console.log(`[AgentService] Enriched ${formattedAmount} with USD value: ${formattedUSD}`);
            } catch (error) {
                console.warn(`[AgentService] Failed to calculate USD value for ${amount} ${currency}:`, error);
            }
        }
    }

    /**
     * Resuelve el destinatario (nickname o email) a una dirección de wallet
     * @param aiResponse - Respuesta del AI para modificar
     * @param userId - ID del usuario para buscar contactos
     * @param network - Red actual para seleccionar la dirección correcta
     */
    private async resolveRecipient(aiResponse: AIResponse, userId: string, network: 'mainnet' | 'testnet' = 'mainnet'): Promise<void> {
        if (!aiResponse.parameters) return;

        const recipientEmail = aiResponse.parameters.recipientEmail;
        const recipientAddress = aiResponse.parameters.recipientAddress;

        console.log(`[resolveRecipient] recipientEmail: "${recipientEmail}", recipientAddress: "${recipientAddress}", network: "${network}"`);

        // Helper to check if a string is a valid Stacks address
        const isValidStacksAddress = (addr: string | null | undefined): boolean => {
            if (!addr) return false;
            return /^(SP|ST)[A-Z0-9]{38,41}$/.test(addr);
        };

        // If recipientAddress looks like a valid Stacks address, nothing to resolve
        if (isValidStacksAddress(recipientAddress)) {
            console.log(`[resolveRecipient] recipientAddress is valid Stacks address, no resolution needed`);
            return;
        }

        // Try to resolve: prioritize recipientEmail, then recipientAddress (might be a nickname)
        const toResolve = recipientEmail || recipientAddress;

        if (toResolve) {
            console.log(`[resolveRecipient] Attempting to resolve: "${toResolve}" for network: ${network}`);
            const resolved = await RecipientResolver.resolveRecipient(userId, toResolve, network);

            if (resolved.address) {
                console.log(`[resolveRecipient] Resolved "${toResolve}" to address: ${resolved.address}`);
                // Store the original value as "email" for display purposes
                aiResponse.parameters.recipientEmail = toResolve;
                aiResponse.parameters.recipientAddress = resolved.address;
            } else {
                console.log(`[resolveRecipient] Could not resolve "${toResolve}" to any address for network: ${network}`);
            }
        }
    }

    // New method to process action results and generate a response message
    // New method to process action results and generate a response message
    async processActionResult(resultInput: ActionResultInput): Promise<{ responseMessage: string }> {
        console.log('Processing action result:', resultInput);
        const { userId, ...inputData } = resultInput; // Extraer userId del input
        
        // Enrich the input data with USD information if it's a successful transaction
        if (resultInput.status === 'success' && 
            resultInput.actionType === 'SEND_TRANSACTION' && 
            resultInput.data.amountSent && 
            resultInput.data.currencySent) {
            
            try {
                const amount = parseFloat(resultInput.data.amountSent);
                const currency = resultInput.data.currencySent;
                
                if (!isNaN(amount) && PriceService.isCurrencySupported(currency)) {
                    const usdValue = await PriceService.calculateUSDValue(currency, amount);
                    const formattedUSD = PriceService.formatUSDAmount(usdValue);

                    // Add USD information to the data
                    (inputData as any).data.usdValue = formattedUSD;
                    console.log(`[AgentService] Added USD value to action result: ${amount} ${currency} = ${formattedUSD}`);
                }
            } catch (error) {
                console.warn('[AgentService] Failed to calculate USD value for action result:', error);
            }
        }

        const inputJsonString = JSON.stringify(inputData);

        try {
            // Call chat with the result data and the ActionResultSystemPrompt
            const responseMessage = await this.geminiService.chat(
                inputJsonString, // The user message is the JSON result data
                ActionResultSystemPrompt // Override system prompt
            );
            console.log('Action Result AI Response:', responseMessage);

            // SAFETY: Sometimes Gemini returns JSON instead of just the message string
            // Try to parse it and extract the responseMessage field
            let finalMessage = responseMessage.trim();
            try {
                const parsed = JSON.parse(finalMessage);
                if (parsed.responseMessage) {
                    finalMessage = parsed.responseMessage;
                    console.log('[AgentService] Extracted responseMessage from JSON response');
                }
            } catch (parseError) {
                // Not JSON, use as-is
            }

            return {
                responseMessage: finalMessage
            };
        } catch (error) {
            console.error('Error processing action result with Gemini:', error);
            return {
                responseMessage: "I received the result of the action, but had trouble formulating a response. Please check the outcome manually if needed."
            };
        }
    }

    // New method for enriched interactive responses
    async processActionResultEnriched(userMessage: string, actionResult: any, originalResponse: AIResponse): Promise<AIResponse> {
        console.log('Processing enriched action result:', actionResult);

        // Primero obtener la respuesta base usando el método existente
        const actionResultInput: ActionResultInput = {
            actionType: originalResponse.action === 'SEND' ? 'SEND_TRANSACTION' :
                       originalResponse.action === 'CHECK_BALANCE' ? 'FETCH_BALANCE' : 'FETCH_HISTORY',
            status: actionResult.status === 'success' ? 'success' : 'failure',
            data: {
                ...actionResult.data,
                // Add user context for language consistency
                userLanguageContext: userMessage
            }
        };

        const baseResponse = await this.processActionResult(actionResultInput);

        const response: AIResponse = {
            action: originalResponse.action,
            parameters: originalResponse.parameters,
            confirmationRequired: false,
            confirmationMessage: null,
            responseMessage: baseResponse.responseMessage,
            quickActions: [],
            richContent: undefined,
            expectsResponse: false
        };

        // Generar contenido rico basado en el tipo de acción
        // Note: actionResult here is the ActionResultInput with { actionType, status, data }
        const isSuccess = actionResult.status === 'success';

        if (originalResponse.action === 'SEND' && isSuccess && actionResult.data?.transactionHash) {
            response.richContent = {
                type: 'transaction_details',
                data: {
                    transactionHash: actionResult.data.transactionHash,
                    amount: actionResult.data.amountSent || originalResponse.parameters?.amount?.toString(),
                    currency: actionResult.data.currencySent || originalResponse.parameters?.currency,
                    recipient: actionResult.data.recipient || originalResponse.parameters?.recipientAddress,
                    recipientNickname: actionResult.data.recipientNickname,
                    explorerUrl: `https://explorer.hiro.so/txid/${actionResult.data.transactionHash}?chain=mainnet`,
                    usdValue: actionResult.data.usdValue
                }
            };

            // Detect language from user message for button labels
            const isSpanish = this.detectSpanishLanguage(userMessage);

            response.quickActions = [
                {
                    type: 'transaction_link',
                    label: isSpanish ? '🔍 Ver en explorador' : '🔍 View on Explorer',
                    value: actionResult.data.transactionHash,
                    url: `https://explorer.hiro.so/txid/${actionResult.data.transactionHash}?chain=mainnet`,
                    style: 'primary'
                },
                {
                    type: 'button',
                    label: isSpanish ? '💰 Revisar balance' : '💰 Check balance',
                    value: isSpanish ? 'revisar mi balance' : 'check my balance',
                    style: 'secondary'
                },
                {
                    type: 'button',
                    label: isSpanish ? '💸 Enviar más' : '💸 Send more',
                    value: isSpanish ? 'enviar dinero' : 'send money',
                    style: 'secondary'
                }
            ];
        }

        if (originalResponse.action === 'CHECK_BALANCE' && isSuccess && actionResult.data?.balance) {
            const balanceData = actionResult.data.balance;
            const tokens = [];
            if (balanceData.stx) {
                tokens.push({
                    symbol: 'STX',
                    balance: balanceData.stx,
                    usdValue: balanceData.stxUsd || 'N/A'
                });
            }
            if (balanceData.ausd || balanceData.usda) {
                tokens.push({
                    symbol: 'aUSD',
                    balance: balanceData.ausd || balanceData.usda,
                    usdValue: balanceData.ausdUsd || balanceData.usdaUsd || 'N/A'
                });
            }
            if (balanceData.sbtc) {
                tokens.push({
                    symbol: 'sBTC',
                    balance: balanceData.sbtc,
                    usdValue: balanceData.sbtcUsd || 'N/A'
                });
            }

            response.richContent = {
                type: 'balance_info',
                data: {
                    tokens: tokens,
                    balance: balanceData.total || 'N/A'
                }
            };

            // Detect language from user message for button labels
            const isSpanish = this.detectSpanishLanguage(userMessage);

            response.quickActions = [
                {
                    type: 'button',
                    label: isSpanish ? '💸 Enviar STX' : '💸 Send STX',
                    value: isSpanish ? 'enviar STX' : 'send STX',
                    style: 'primary'
                },
                {
                    type: 'button',
                    label: isSpanish ? '💸 Enviar aUSD' : '💸 Send aUSD',
                    value: isSpanish ? 'enviar aUSD' : 'send aUSD',
                    style: 'primary'
                },
                {
                    type: 'button',
                    label: isSpanish ? '💸 Enviar sBTC' : '💸 Send sBTC',
                    value: isSpanish ? 'enviar sBTC' : 'send sBTC',
                    style: 'primary'
                },
                {
                    type: 'button',
                    label: isSpanish ? '📞 Enviar a contacto' : '📞 Send to contact',
                    value: isSpanish ? 'mostrar contactos' : 'show contacts',
                    style: 'secondary'
                }
            ];
        }

        // Manejo específico para historial de transacciones
        if ((originalResponse.action === 'VIEW_HISTORY' || originalResponse.action === 'FETCH_HISTORY') && isSuccess && actionResult.data?.history) {
            // Detect language from user message for button labels
            const isSpanish = this.detectSpanishLanguage(userMessage);

            // No necesitamos richContent para historial, pero sí acciones rápidas útiles
            response.quickActions = [
                {
                    type: 'button',
                    label: isSpanish ? '📊 Ver historial completo' : '📊 View full history',
                    value: isSpanish ? 'abrir pantalla de historial de transacciones' : 'open transaction history screen',
                    style: 'primary'
                },
                {
                    type: 'button',
                    label: isSpanish ? '💸 Enviar dinero' : '💸 Send money',
                    value: isSpanish ? 'enviar dinero' : 'send money',
                    style: 'secondary'
                },
                {
                    type: 'button',
                    label: isSpanish ? '💰 Revisar balance' : '💰 Check balance',
                    value: isSpanish ? 'revisar mi balance' : 'check my balance',
                    style: 'secondary'
                },
                {
                    type: 'button',
                    label: isSpanish ? '📱 Solo enviados' : '📱 Show sent only',
                    value: isSpanish ? 'mostrar solo transacciones enviadas' : 'show only sent transactions',
                    style: 'secondary'
                }
            ];
        }

        this.generateInteractiveElements(response, userMessage);
        return response;
    }

    private generateInteractiveElements(aiResponse: AIResponse, userMessage: string): void {
        const message = userMessage.toLowerCase();
        const action = aiResponse.action;
        
        // Improved language detection
        const isSpanish = this.detectSpanishLanguage(userMessage);

        // Generar botones de acción rápida basados en el contexto
        if (aiResponse.confirmationRequired) {
            aiResponse.quickActions = [
                {
                    type: 'button',
                    label: isSpanish ? '✅ Sí, confirmar' : '✅ Yes, confirm',
                    value: isSpanish ? 'sí' : 'yes',
                    style: 'success'
                },
                {
                    type: 'button',
                    label: isSpanish ? '❌ Cancelar' : '❌ Cancel',
                    value: isSpanish ? 'no' : 'no',
                    style: 'danger'
                }
            ];
        }

        // Opciones de moneda para transacciones
        const needsCurrencySelection = !aiResponse.parameters?.currency && (
            message.includes('currency') || 
            message.includes('moneda') ||
            message.includes('much') ||
            message.includes('cuanto') ||
            aiResponse.responseMessage.toLowerCase().includes('stx') ||
            aiResponse.responseMessage.toLowerCase().includes('usda') ||
            aiResponse.responseMessage.toLowerCase().includes('sbtc') ||
            aiResponse.responseMessage.toLowerCase().includes('how much') ||
            aiResponse.responseMessage.toLowerCase().includes('specify in') ||
            (action === 'CLARIFY' && aiResponse.parameters?.recipientAddress && !aiResponse.parameters?.amount)
        );

        if ((action === 'SEND' || action === 'CLARIFY') && needsCurrencySelection) {
            aiResponse.quickActions = [
                {
                    type: 'button',
                    label: '🔷 STX',
                    value: 'STX',
                    style: 'primary'
                },
                {
                    type: 'button',
                    label: '💰 aUSD',
                    value: 'aUSD',
                    style: 'primary'
                },
                {
                    type: 'button',
                    label: '₿ sBTC',
                    value: 'sBTC',
                    style: 'secondary'
                }
            ];
            aiResponse.expectsResponse = true;
        }

        // Opciones de montos comunes cuando pregunta por cantidad
        const needsAmountSelection = !aiResponse.parameters?.amount && action === 'CLARIFY' && 
            aiResponse.parameters?.recipientAddress && (
                aiResponse.responseMessage.toLowerCase().includes('how much') ||
                aiResponse.responseMessage.toLowerCase().includes('cuanto') ||
                aiResponse.responseMessage.toLowerCase().includes('amount') ||
                aiResponse.responseMessage.toLowerCase().includes('cantidad')
            );

        if (needsAmountSelection && !needsCurrencySelection) {
            aiResponse.quickActions = [
                {
                    type: 'button',
                    label: isSpanish ? '💵 $10 USD' : '💵 $10 USD worth',
                    value: '10 aUSD',
                    style: 'secondary'
                },
                {
                    type: 'button',
                    label: isSpanish ? '💵 $50 USD' : '💵 $50 USD worth',
                    value: '50 aUSD',
                    style: 'primary'
                },
                {
                    type: 'button',
                    label: '🔷 100 STX',
                    value: '100 STX',
                    style: 'secondary'
                },
                {
                    type: 'button',
                    label: '₿ 0.001 sBTC',
                    value: '0.001 sBTC',
                    style: 'secondary'
                }
            ];
            aiResponse.expectsResponse = true;
        }

        // Opciones comunes para el balance
        if (action === 'CHECK_BALANCE' && !aiResponse.richContent) {
            aiResponse.quickActions = [
                {
                    type: 'button',
                    label: isSpanish ? '📊 Mostrar balance detallado' : '📊 Show detailed balance',
                    value: isSpanish ? 'mostrar balance detallado' : 'show detailed balance',
                    style: 'primary'
                },
                {
                    type: 'button',
                    label: isSpanish ? '💸 Enviar dinero' : '💸 Send money',
                    value: isSpanish ? 'enviar dinero' : 'send money',
                    style: 'secondary'
                },
                {
                    type: 'button',
                    label: isSpanish ? '📞 Contactar alguien' : '📞 Contact someone',
                    value: isSpanish ? 'mostrar contactos' : 'show contacts',
                    style: 'secondary'
                }
            ];
        }

        // Opciones para historial de transacciones
        if (action === 'VIEW_HISTORY' && !aiResponse.richContent) {
            aiResponse.quickActions = [
                {
                    type: 'button',
                    label: isSpanish ? '📊 Transacciones recientes' : '📊 Recent transactions',
                    value: isSpanish ? 'mostrar transacciones recientes' : 'show recent transactions',
                    style: 'primary'
                },
                {
                    type: 'button',
                    label: isSpanish ? '📤 Transacciones enviadas' : '📤 Sent transactions',
                    value: isSpanish ? 'mostrar solo transacciones enviadas' : 'show sent transactions only',
                    style: 'secondary'
                },
                {
                    type: 'button',
                    label: isSpanish ? '📥 Transacciones recibidas' : '📥 Received transactions',
                    value: isSpanish ? 'mostrar solo transacciones recibidas' : 'show received transactions only',
                    style: 'secondary'
                },
                {
                    type: 'button',
                    label: isSpanish ? '📱 Abrir pantalla historial' : '📱 Open history screen',
                    value: isSpanish ? 'abrir historial completo de transacciones' : 'open full transaction history',
                    style: 'secondary'
                }
            ];
        }

        // Acciones generales útiles
        if (action === 'GREETING') {
            aiResponse.quickActions = [
                {
                    type: 'button',
                    label: isSpanish ? '💰 Revisar balance' : '💰 Check balance',
                    value: isSpanish ? 'revisar mi balance' : 'check my balance',
                    style: 'primary'
                },
                {
                    type: 'button',
                    label: isSpanish ? '💸 Enviar dinero' : '💸 Send money',
                    value: isSpanish ? 'enviar dinero' : 'send money',
                    style: 'secondary'
                },
                {
                    type: 'button',
                    label: isSpanish ? '🔄 Intercambiar tokens' : '🔄 Swap tokens',
                    value: isSpanish ? 'intercambiar STX por aUSD' : 'swap STX to aUSD',
                    style: 'secondary'
                },
                {
                    type: 'button',
                    label: isSpanish ? '📊 Ver historial' : '📊 View history',
                    value: isSpanish ? 'ver historial de transacciones' : 'view transaction history',
                    style: 'secondary'
                }
            ];
        }

        // Acciones específicas para SWAP
        if (action === 'SWAP' && aiResponse.confirmationRequired) {
            aiResponse.quickActions = [
                {
                    type: 'button',
                    label: isSpanish ? '✅ Confirmar intercambio' : '✅ Confirm swap',
                    value: isSpanish ? 'sí, confirmar intercambio' : 'yes, confirm swap',
                    style: 'success'
                },
                {
                    type: 'button',
                    label: isSpanish ? '❌ Cancelar' : '❌ Cancel',
                    value: isSpanish ? 'no, cancelar' : 'no, cancel',
                    style: 'danger'
                }
            ];
        }

        // Opciones de SWAP comunes cuando no está completo
        if (action === 'CLARIFY' && (message.includes('swap') || message.includes('exchange') || message.includes('intercambi') || message.includes('convert'))) {
            aiResponse.quickActions = [
                {
                    type: 'button',
                    label: '🔷 STX → 💰 aUSD',
                    value: isSpanish ? 'intercambiar STX por aUSD' : 'swap STX to aUSD',
                    style: 'primary'
                },
                {
                    type: 'button',
                    label: '💰 aUSD → 🔷 STX',
                    value: isSpanish ? 'intercambiar aUSD por STX' : 'swap aUSD to STX',
                    style: 'primary'
                }
            ];
        }
    }

    private detectSpanishLanguage(userMessage: string): boolean {
        // First check for Spanish-specific characters
        if (/[\u00C0-\u017F]/.test(userMessage)) {
            return true;
        }

        // Spanish-specific words that are unlikely to appear in English context
        const spanishOnlyWords = /\b(enviar|dinero|revisar|mostrar|hola|gracias|sí|historial|transacciones|cuanto|cuánto|moneda|intercambiar|quiero|necesito)\b/i;
        
        // English indicators that should override Spanish detection
        const englishIndicators = /\b(i\s+want|i\s+need|send|swap|check|balance|transaction|history|money|want\s+to|need\s+to|how\s+much|can\s+you)\b/i;
        
        // If we find strong English indicators, assume English
        if (englishIndicators.test(userMessage)) {
            return false;
        }
        
        // Only detect Spanish if we find Spanish-specific words
        return spanishOnlyWords.test(userMessage);
    }
} 