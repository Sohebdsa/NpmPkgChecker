const dependencyService = require('../services/dependencyService');
const riskEngine = require('../services/riskEngine');

exports.scanPackage = async (req, res) => {
    try {
        const packageName = req.body.package;
        if (!packageName) {
            return res.status(400).json({ error: 'Package name is required' });
        }

        console.log(`Starting scan for package: ${packageName}`);

        // 1. Fetch deep dependency tree and wait for scans
        const tree = await dependencyService.fetchDependencyTree(packageName);

        // 2. Calculate final risk logic based on tree node flags
        const treeWithScores = riskEngine.evaluateTreeScore(tree);

        res.json({
            name: treeWithScores.name,
            version: treeWithScores.version,
            riskScore: treeWithScores.riskScore,
            classification: treeWithScores.classification,
            dependencies: treeWithScores.dependencies || []
        });
    } catch (err) {
        console.error('Scan Controller Error:', err);
        res.status(500).json({ error: 'Failed to scan package', message: err.message });
    }
};
