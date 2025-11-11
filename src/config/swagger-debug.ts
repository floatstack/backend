import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Debug function to check what files swagger will scan
const debugSwaggerFiles = async () => {
    console.log('\n🔍 Debugging Swagger file scanning...\n');
    
    const patterns = [
        './src/modules/**/*.{ts,js}',
        './dist/modules/**/**/*.js',
        './modules/**/**/*.js'      
    ];

    for (const pattern of patterns) {
        console.log(`📁 Scanning pattern: ${pattern}`);
        try {
            const files = await glob(pattern);
            console.log(`   Found ${files.length} files:`);
            files.forEach(file => console.log(`   - ${file}`));
            console.log('');
        } catch (error) {
            console.log(`   ❌ Error scanning: ${(error as Error)?.message}|"Unknown error"\n`);
        }
    }

    // Check specific files
    const specificFiles = [
        './src/modules/auth/routes/authRoute.ts'
    ];

    console.log('🎯 Checking specific files:');
    specificFiles.forEach(file => {
        const exists = fs.existsSync(file);
        console.log(`   ${exists ? '✅' : '❌'} ${file}`);
    });
    console.log('');
};

// Call this function before generating swagger spec
// debugSwaggerFiles();

export { debugSwaggerFiles };