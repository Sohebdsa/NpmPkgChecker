const axios = require('axios');
const scannerService = require('./scannerService');

class DependencyService {
    constructor() {
        this.cache = new Map();
    }

    async fetchDependencyTree(packageName, version = 'latest', visited = new Set(), depth = 0) {
        const packageKey = `${packageName}@${version}`;
        
        if (visited.has(packageKey)) {
            return { name: packageName, version, warning: 'circular dependency detected', skip: true };
        }
        
        // Prevent extremely deep scanning if it goes out of hand (e.g. infinite loops somehow escaping cache)
        if (depth > 20) {
            return { name: packageName, version, warning: 'max depth reached', skip: true };
        }

        visited.add(packageKey);

        if (this.cache.has(packageKey)) {
            return this.cache.get(packageKey);
        }

        try {
            console.log(`Fetching metadata for ${packageName}@${version}`);
            const response = await axios.get(`https://registry.npmjs.org/${packageName}/${version === 'latest' ? '' : version}`);
            const data = response.data;
            
            // For 'latest', the API might return the full metadata doc or just the version doc.
            // If we asked for latest with '', it returns full doc and we need to pick latest version.
            let versionData = data;
            if (version === 'latest' && data['dist-tags']) {
                const latestVersion = data['dist-tags'].latest;
                versionData = data.versions[latestVersion];
            }

            const actualVersion = versionData.version;
            const tarballUrl = versionData.dist && versionData.dist.tarball;
            const scripts = versionData.scripts || {};

            // Perform deep scan using scannerService
            const scanResults = await scannerService.scanTarball(packageName, actualVersion, tarballUrl, scripts);

            // Fetch children
            const dependencies = versionData.dependencies || {};
            const childNodes = [];

            for (const [depName, depVersionStr] of Object.entries(dependencies)) {
                // To simplify, we just ask npm for the 'latest' or specifically strip ranges.
                // In a perfect system we'd use semver to resolve, but for this tool `latest` for nested is acceptable to find risks,
                // or we extract clean version. We will just pass the raw semver to npm registry which sometimes resolves it or we strip.
                // Stripping ^ or ~ or > for simplest npm fetch:
                const cleanVersionGrp = depVersionStr.match(/\d+\.\d+\.\d+/);
                const fetchVersion = cleanVersionGrp ? cleanVersionGrp[0] : 'latest';

                const childNode = await this.fetchDependencyTree(depName, fetchVersion, new Set(visited), depth + 1);
                if (!childNode.skip) {
                    childNodes.push(childNode);
                }
            }

            const node = {
                name: packageName,
                version: actualVersion,
                scanResults: scanResults,
                dependencies: childNodes,
                isRoot: depth === 0
            };

            this.cache.set(packageKey, node);
            return node;

        } catch (error) {
            console.error(`Error fetching dependency ${packageName}@${version}:`, error.message);
            return {
                name: packageName,
                version,
                error: 'Failed to fetch',
                skip: false
            };
        }
    }
}

module.exports = new DependencyService();
