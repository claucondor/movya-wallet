// backend/services/agent/testAgentService.js

require('dotenv').config({ path: '../../.env' }); // Load .env file from root
const AgentService = require('./agentService');

const openRouterApiKey = process.env.OPENROUTER_API_KEY;

if (!openRouterApiKey) {
    console.error("ERROR: OPENROUTER_API_KEY not found in environment variables or .env file.");
    console.log("Please create a .env file in the project root directory with OPENROUTER_API_KEY=your_key");
    process.exit(1);
}

const agentService = new AgentService(openRouterApiKey);

// Helper function to run a conversation turn
async function runTurn(scenarioName, turn, userMessage, currentState) {
    console.log(`\n--- ${scenarioName} - Turn ${turn} ---`);
    console.log(`User > ${userMessage}`);

    const result = await agentService.processMessage(userMessage, currentState);

    console.log(`Agent > Response Message: ${result.responseMessage}`);
    console.log(`Agent > Action Details: ${JSON.stringify(result.actionDetails, null, 2)}`);
    console.log(`Agent > New State: ${JSON.stringify(result.newState, null, 2)}`);
    console.log(`----------------------------------`);
    return result.newState; // Return the state for the next turn
}

// --- Test Scenarios ---

async function scenario1_Greeting() {
    const scenarioName = "Scenario 1: Simple Greeting";
    let state = null;
    state = await runTurn(scenarioName, 1, "Hello there", state);
}

async function scenario2_CheckBalance() {
    const scenarioName = "Scenario 2: Check Balance";
    let state = null;
    state = await runTurn(scenarioName, 1, "What's my current balance?", state);
}

async function scenario3_SendEmail() {
    const scenarioName = "Scenario 3: Send Flow (Email)";
    let state = null;
    state = await runTurn(scenarioName, 1, "I need to send some crypto", state);
    state = await runTurn(scenarioName, 2, "Send it to test@example.com", state);
    state = await runTurn(scenarioName, 3, "15 MATIC", state);
    state = await runTurn(scenarioName, 4, "Yes, confirm", state); // User confirms
}

async function scenario4_SendAddress() {
    const scenarioName = "Scenario 4: Send Flow (Address)";
    let state = null;
    state = await runTurn(scenarioName, 1, "Send money", state);
    state = await runTurn(scenarioName, 2, "to 0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B", state); // Vitalik's address for example
    state = await runTurn(scenarioName, 3, "0.5 ETH", state);
    state = await runTurn(scenarioName, 4, "yeah looks good", state); // User confirms
}

async function scenario5_SendThenBalance() {
    const scenarioName = "Scenario 5: Send Then Check Balance";
    let state = null;
    state = await runTurn(scenarioName, 1, "Send $20 to alice@email.com", state);
    state = await runTurn(scenarioName, 2, "confirm", state); // User confirms send
    // Now, start a new action in the next turn
    state = await runTurn(scenarioName, 3, "Ok, now what's my balance?", state);
}

async function scenario6_Correction() {
    const scenarioName = "Scenario 6: Handle Correction";
    let state = null;
    state = await runTurn(scenarioName, 1, "send to bob@example.com", state);
    state = await runTurn(scenarioName, 2, "send 100 USDC", state);
    state = await runTurn(scenarioName, 3, "actually, make that 120 USDC instead", state); // User corrects amount
    state = await runTurn(scenarioName, 4, "yes please proceed", state); // User confirms the corrected amount
}


// --- Run Tests ---
async function runAllTests() {
    console.log("Starting AgentService Tests...\n");

    await scenario1_Greeting();
    await scenario2_CheckBalance();
    await scenario3_SendEmail();
    await scenario4_SendAddress();
    await scenario5_SendThenBalance();
    await scenario6_Correction();

    console.log("\n--- All tests completed ---");
}

runAllTests().catch(error => {
    console.error("\n--- A critical error occurred during testing ---");
    console.error(error);
    process.exit(1);
}); 