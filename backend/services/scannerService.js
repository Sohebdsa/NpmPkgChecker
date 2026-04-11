const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const tar = require('tar');
const os = require('os');
const crypto = require('crypto');

class ScannerService {
    async scanTarball(packageName, version, tarballUrl, scripts) {
        let findings = [];

        // 1. Check install scripts from package.json metadata
        const suspiciousScripts = ['preinstall', 'postinstall', 'install'];
        for (const scriptName of suspiciousScripts) {
            if (scripts[scriptName]) {
                findings.push({
                    type: 'script',
                    severity: 'high',
                    file: 'package.json',
                    line: 1,
                    snippet: `"${scriptName}": "${scripts[scriptName]}"`,
                    reason: `Uses dangerous lifecycle script (${scriptName})`
                });
            }
        }

        if (!tarballUrl) {
            return findings;
        }

        const tempDir = path.join(os.tmpdir(), `safeinstall_${crypto.randomBytes(8).toString('hex')}`);
        const tarballPath = path.join(tempDir, 'package.tgz');

        try {
            await fs.ensureDir(tempDir);

            // Download tarball
            const response = await axios({
                url: tarballUrl,
                method: 'GET',
                responseType: 'stream'
            });

            // Save tarball to temp
            const writer = fs.createWriteStream(tarballPath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            // Extract tarball
            const extractDir = path.join(tempDir, 'extracted');
            await fs.ensureDir(extractDir);
            
            await tar.x({
                file: tarballPath,
                cwd: extractDir
            });

            // Recursively read files (limit to .js files)
            const filesToScan = await this.getAllJsFiles(extractDir);

            for (const file of filesToScan) {
                const content = await fs.readFile(file, 'utf-8');
                const fileFindings = this.scanFileContent(content, file, extractDir);
                findings = findings.concat(fileFindings);
            }

        } catch (error) {
            console.error(`Failed to scan tarball for ${packageName}@${version}:`, error.message);
        } finally {
            // Cleanup
            try {
                await fs.remove(tempDir);
            } catch (cleanupError) {
                console.error('Failed to cleanup temp dir', cleanupError.message);
            }
        }

        return findings;
    }

    async getAllJsFiles(dir) {
        let results = [];
        try {
            const list = await fs.readdir(dir);
            for (const file of list) {
                const fullPath = path.join(dir, file);
                const stat = await fs.stat(fullPath);
                if (stat && stat.isDirectory()) {
                    // Avoid scanning excessive test/mock folders to speed things up
                    if (file !== 'test' && file !== 'tests' && file !== 'node_modules') {
                        results = results.concat(await this.getAllJsFiles(fullPath));
                    }
                } else if (file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.cjs')) {
                    results.push(fullPath);
                }
            }
        } catch (err) {
            console.error('Error walking directory', err);
        }
        return results;
    }

    scanFileContent(content, fullPath, extractDir) {
        const findings = [];
        const lines = content.split('\n');
        
        // Relative path for UI display (e.g., package/dist/index.js)
        const relPath = path.relative(extractDir, fullPath);

        const rules = [
            { regex: /child_process/g, type: 'api', severity: 'high', reason: 'Uses child_process (potential arbitrary command execution)' },
            { regex: /eval\s*\(/g, type: 'api', severity: 'high', reason: 'Uses eval() (potential arbitrary code execution)' },
            { regex: /Buffer\.from\([^,]+,\s*['"]base64['"]\)/g, type: 'obfuscation', severity: 'medium', reason: 'Uses base64 decoding (potential hidden malicious payload)' },
            { regex: /(https?:\/\/(?!registry\.npmjs\.org|github\.com)[^\s'"]+)/g, type: 'network', severity: 'low', reason: 'Contains hardcoded network request / URL' }
        ];

        lines.forEach((line, index) => {
            // Skip extremely long minified lines to avoid regex DoS, limit to reasonable length
            if (line.length > 500) {
                return;
            }

            for (const rule of rules) {
                if (rule.regex.test(line)) {
                    findings.push({
                        type: rule.type,
                        severity: rule.severity,
                        file: relPath,
                        line: index + 1,
                        snippet: line.trim().substring(0, 150), // keep it short for UI
                        reason: rule.reason
                    });
                }
                // Reset regex state since we use /g
                rule.regex.lastIndex = 0;
            }
        });

        return findings;
    }
}

module.exports = new ScannerService();
