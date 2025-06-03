// Interactive elements types
export interface ChatAction {
    type: 'button' | 'link' | 'transaction_link';
    label: string;
    value: string;
    style?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
    url?: string;
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

// Agent Response and Action Types
export interface AIResponse {
    action: 'SEND' | 'CHECK_BALANCE' | 'VIEW_HISTORY' | 'CLARIFY' | 'GREETING' | 'ERROR';
    parameters: {
        recipientEmail: string | null;
        recipientAddress: string | null;
        amount: string | null;
        currency: string | null;
    } | null;
    confirmationRequired: boolean;
    confirmationMessage: string | null;
    responseMessage: string;
    // New interactive fields
    quickActions?: ChatAction[];
    richContent?: RichContent;
    expectsResponse?: boolean;
}

export interface AgentServiceResponse {
    responseMessage: string;
    newState: AIResponse | null;
    actionDetails: {
        type: 'SEND_TRANSACTION' | 'FETCH_BALANCE' | 'FETCH_HISTORY' | null;
        recipientAddress?: string | null;
        recipientEmail?: string | null;
        amount?: string | null;
        currency?: string | null;
    } | null;
}

export interface ActionResultInput {
    actionType: 'SEND_TRANSACTION' | 'FETCH_BALANCE' | 'FETCH_HISTORY';
    status: 'success' | 'failure';
    data: {
        // Transaction success data
        transactionHash?: string;
        amountSent?: string;
        currencySent?: string;
        recipient?: string;
        
        // Balance success data
        balance?: string;
        
        // History success data
        history?: Array<{
            date: string;
            type: 'sent' | 'received';
            amount: string;
            recipientOrSender: string;
        }>;
        
        // Error data
        errorCode?: string;
        errorMessage?: string;
    };
}

// Message type for chat UI
export interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'agent';
    timestamp: number;
    actionRequired?: AgentServiceResponse['actionDetails'];
    conversationId?: string;
    // Interactive elements
    quickActions?: ChatAction[];
    richContent?: RichContent;
}

export interface SearchParams {
    conversationId?: string | string[];
    from?: string;
}

// Add a default export to suppress Expo Router "missing default export" warning
export default function AgentTypesExport() {
  return null; // This will never be rendered
} 