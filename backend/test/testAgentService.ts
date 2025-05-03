import * as assert from 'assert';
import * as dotenv from 'dotenv';
import AgentService, { type AgentServiceResponse, type AIResponse } from './agentService';
dotenv.config({ path: '../../.env' }); // Adjust path relative to compiled file in dist

const openRouterApiKey: string | undefined = process.env.OPENROUTER_API_KEY;

if (!openRouterApiKey) {
    console.error("ERROR: OPENROUTER_API_KEY not found in environment variables or .env file.");
    console.log("Please create a .env file in the project root directory with OPENROUTER_API_KEY=your_key");
    process.exit(1);
}

const agentService = new AgentService(openRouterApiKey);

// Counter for failed assertions
let failedAssertions = 0;

// Define expectations type
interface TestExpectations {
    action?: AIResponse['action'];
    confirmationRequired?: boolean;
    actionDetailsType?: AgentServiceResponse['actionDetails']['type'];
    recipientEmail?: string;
    recipientAddress?: string; // Can be partial for includes check
    amount?: number | string;
    currency?: string;
    responseIncludes?: string;
    stateNotNull?: boolean;
    actionDetailsNotNull?: boolean;
}

// Helper function to run a conversation turn and validate expectations
async function runTurn(
    scenarioName: string,
    turn: number,
    userMessage: string,
    currentState: AIResponse | null,
    expectations: TestExpectations = {}
): Promise<AIResponse | null> {
    console.log(`\n--- ${scenarioName} - Turn ${turn} ---`);
    console.log(`User > ${userMessage}`);
    console.log(`Expecting > ${JSON.stringify(expectations)}`);

    const result: AgentServiceResponse = await agentService.processMessage(userMessage, currentState);

    console.log(`Agent > Response Message: ${result.responseMessage}`);
    console.log(`Agent > Action Details: ${JSON.stringify(result.actionDetails, null, 2)}`);
    console.log(`Agent > New State: ${JSON.stringify(result.newState, null, 2)}`);

    try {
        // --- Assertions ---
        const state: Partial<AIResponse> = result.newState || {}; // Use Partial for safety
        const params = state.parameters || {};
        const actionDetails: Partial<AgentServiceResponse['actionDetails']> = result.actionDetails || {};

        if (expectations.action) {
            assert.strictEqual(state.action, expectations.action, `Expected action to be ${expectations.action}, but got ${state.action}`);
        }
        if (expectations.confirmationRequired !== undefined) {
            assert.strictEqual(state.confirmationRequired, expectations.confirmationRequired, `Expected confirmationRequired to be ${expectations.confirmationRequired}, but got ${state.confirmationRequired}`);
        }
        if (expectations.actionDetailsType) {
            if (!actionDetails) {
                assert.fail('Expected actionDetails to not be null when checking type');
            } else {
                // Use type assertion to bypass linter error for now
                assert.strictEqual((actionDetails as any).type, expectations.actionDetailsType, `Expected actionDetails.type to be ${expectations.actionDetailsType}, but got ${(actionDetails as any).type}`);
            }
        }
        if (expectations.recipientEmail) {
            assert.strictEqual(params.recipientEmail, expectations.recipientEmail, `Expected parameters.recipientEmail to be ${expectations.recipientEmail}, but got ${params.recipientEmail}`);
        }
        if (expectations.recipientAddress) {
            assert.ok(params.recipientAddress?.includes(expectations.recipientAddress), `Expected parameters.recipientAddress to include ${expectations.recipientAddress}, but got ${params.recipientAddress}`);
        }
        if (expectations.amount !== undefined) { // Check if amount expectation exists
             assert.strictEqual(params.amount, expectations.amount, `Expected parameters.amount to be ${expectations.amount}, but got ${params.amount}`);
        }
        if (expectations.currency) {
            assert.strictEqual(params.currency?.toUpperCase(), expectations.currency?.toUpperCase(), `Expected parameters.currency to be ${expectations.currency}, but got ${params.currency}`);
        }
        if (expectations.responseIncludes) {
             assert.ok(result.responseMessage.includes(expectations.responseIncludes), `Expected responseMessage to include "${expectations.responseIncludes}"`);
        }
        if (expectations.stateNotNull) {
            assert.ok(result.newState !== null, "Expected newState to not be null");
        }
        if (expectations.actionDetailsNotNull) {
            assert.ok(result.actionDetails !== null, "Expected actionDetails to not be null");
        }

        console.log("Assertions PASSED");

    } catch (error: any) { // Catch assertion errors
        failedAssertions++;
        console.error(`Assertion FAILED: ${error.message}`);
    }

    console.log(`----------------------------------`);
    return result.newState; // Return the state for the next turn
}

// --- Test Scenarios with Expectations ---

async function scenario1_Greeting(): Promise<void> {
    const scenarioName = "Scenario 1: Simple Greeting";
    let state: AIResponse | null = null;
    state = await runTurn(scenarioName, 1, "Hello there", state, { action: 'GREETING', stateNotNull: true });
}

async function scenario2_CheckBalance(): Promise<void> {
    const scenarioName = "Scenario 2: Check Balance";
    let state: AIResponse | null = null;
    state = await runTurn(scenarioName, 1, "What's my current balance?", state, { action: 'CHECK_BALANCE', actionDetailsType: 'FETCH_BALANCE', stateNotNull: true, actionDetailsNotNull: true });
}

async function scenario3_SendEmail(): Promise<void> {
    const scenarioName = "Scenario 3: Send Flow (Email)";
    let state: AIResponse | null = null;
    state = await runTurn(scenarioName, 1, "I need to send some crypto", state, { action: 'CLARIFY', responseIncludes: 'who', stateNotNull: true });
    state = await runTurn(scenarioName, 2, "Send it to test@example.com", state, { action: 'CLARIFY', responseIncludes: 'how much', recipientEmail: 'test@example.com', stateNotNull: true });
    state = await runTurn(scenarioName, 3, "15 MATIC", state, { action: 'SEND', confirmationRequired: true, recipientEmail: 'test@example.com', amount: 15, currency: 'MATIC', responseIncludes: 'confirm', stateNotNull: true });
    state = await runTurn(scenarioName, 4, "Yes, confirm", state, { action: 'SEND', confirmationRequired: false, actionDetailsType: 'SEND_TRANSACTION', recipientEmail: 'test@example.com', amount: 15, currency: 'MATIC', stateNotNull: true, actionDetailsNotNull: true });
}

async function scenario4_SendAddress(): Promise<void> {
    const scenarioName = "Scenario 4: Send Flow (Address)";
    let state: AIResponse | null = null;
    const testAddress = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B";
    state = await runTurn(scenarioName, 1, "Send money", state, { action: 'CLARIFY', responseIncludes: 'who', stateNotNull: true });
    state = await runTurn(scenarioName, 2, `to ${testAddress}`, state, { action: 'CLARIFY', responseIncludes: 'how much', recipientAddress: testAddress, stateNotNull: true });
    state = await runTurn(scenarioName, 3, "0.5 ETH", state, { action: 'SEND', confirmationRequired: true, recipientAddress: testAddress, amount: 0.5, currency: 'ETH', responseIncludes: 'confirm', stateNotNull: true });
    state = await runTurn(scenarioName, 4, "yeah looks good", state, { action: 'SEND', confirmationRequired: false, actionDetailsType: 'SEND_TRANSACTION', recipientAddress: testAddress, amount: 0.5, currency: 'ETH', stateNotNull: true, actionDetailsNotNull: true });
}

async function scenario5_SendThenBalance(): Promise<void> {
    const scenarioName = "Scenario 5: Send Then Check Balance";
    let state: AIResponse | null = null;
    state = await runTurn(scenarioName, 1, "Send $20 to alice@email.com", state, { action: 'SEND', confirmationRequired: true, recipientEmail: 'alice@email.com', amount: 20, currency: 'USD', stateNotNull: true });
    state = await runTurn(scenarioName, 2, "confirm", state, { action: 'SEND', confirmationRequired: false, actionDetailsType: 'SEND_TRANSACTION', recipientEmail: 'alice@email.com', amount: 20, currency: 'USD', stateNotNull: true, actionDetailsNotNull: true });
    state = await runTurn(scenarioName, 3, "Ok, now what's my balance?", state, { action: 'CHECK_BALANCE', actionDetailsType: 'FETCH_BALANCE', stateNotNull: true, actionDetailsNotNull: true });
}

async function scenario6_Correction(): Promise<void> {
    const scenarioName = "Scenario 6: Handle Correction";
    let state: AIResponse | null = null;
    state = await runTurn(scenarioName, 1, "send to bob@example.com", state, { action: 'CLARIFY', recipientEmail: 'bob@example.com', responseIncludes: 'how much', stateNotNull: true });
    state = await runTurn(scenarioName, 2, "send 100 USDC", state, { action: 'SEND', confirmationRequired: true, recipientEmail: 'bob@example.com', amount: 100, currency: 'USDC', stateNotNull: true });
    // AI should pick up the new amount from the message and previous state context
    state = await runTurn(scenarioName, 3, "actually, make that 120 USDC instead", state, { action: 'SEND', confirmationRequired: true, recipientEmail: 'bob@example.com', amount: 120, currency: 'USDC', responseIncludes: '120 USDC', stateNotNull: true });
    state = await runTurn(scenarioName, 4, "yes please proceed", state, { action: 'SEND', confirmationRequired: false, actionDetailsType: 'SEND_TRANSACTION', recipientEmail: 'bob@example.com', amount: 120, currency: 'USDC', stateNotNull: true, actionDetailsNotNull: true });
}


// --- Run Tests ---
async function runAllTests(): Promise<void> {
    console.log("Starting AgentService Tests with Assertions...\n");
    failedAssertions = 0; // Reset counter

    await scenario1_Greeting();
    await scenario2_CheckBalance();
    await scenario3_SendEmail();
    await scenario4_SendAddress();
    await scenario5_SendThenBalance();
    await scenario6_Correction();

    console.log("\n--- Test Run Summary ---");
    if (failedAssertions === 0) {
        console.log("✅ All assertions passed!");
    } else {
        console.error(`❌ ${failedAssertions} assertion(s) failed.`);
        process.exitCode = 1; // Exit with error code if tests fail
    }
    console.log("------------------------");
}

runAllTests().catch(error => {
    console.error("\n--- A critical error occurred during testing ---");
    console.error(error);
    process.exit(1);
}); 