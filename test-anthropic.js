const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config({ path: '.env.local' });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function testAnthropicConnection() {
  try {
    console.log('Testing Anthropic API connection...');
    console.log('API Key exists:', !!process.env.ANTHROPIC_API_KEY);
    console.log('API Key prefix:', process.env.ANTHROPIC_API_KEY?.substring(0, 20) + '...');

    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 100,
      messages: [{
        role: "user",
        content: "Hello, respond with 'API working' if you can see this message."
      }]
    });

    console.log('✅ Anthropic API connection successful');
    console.log('Response:', message.content[0].text);
    
    // Test beta API
    console.log('\nTesting beta API with streaming...');
    const stream = await anthropic.beta.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 50,
      stream: true,
      messages: [{
        role: "user",
        content: "Say hello"
      }],
      betas: ["web-search-2025-03-05"]
    });

    let streamResult = '';
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && 'text' in chunk.delta) {
        streamResult += chunk.delta.text;
      }
    }
    
    console.log('✅ Beta streaming API working');
    console.log('Stream result:', streamResult);
    
  } catch (error) {
    console.error('❌ Anthropic API error:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    if (error.error) {
      console.error('Error details:', error.error);
    }
  }
}

testAnthropicConnection();