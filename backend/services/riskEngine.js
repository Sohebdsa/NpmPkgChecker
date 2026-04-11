const similarityCheck = require('../utils/similarityCheck');

class RiskEngine {
    evaluateTreeScore(node) {
        if (!node || node.skip) {
            return {
                name: node?.name,
                version: node?.version,
                warning: node?.warning,
                skip: true,
                riskScore: 0,
                classification: 'safe'
            };
        }

        let ownScore = 0;
        let reasons = [];

        // 1. Typosquatting Check
        const typoWarning = similarityCheck.checkTyposquatting(node.name);
        if (typoWarning) {
            ownScore += 30;
            reasons.push(typoWarning);
        }

        // 2. Scan Results — score ONLY this package's own findings
        if (node.scanResults && Array.isArray(node.scanResults)) {
            node.scanResults.forEach(finding => {
                let addScore = 0;
                if (finding.severity === 'high')   addScore = 20;
                else if (finding.severity === 'medium') addScore = 12;
                else if (finding.severity === 'low')    addScore = 4;
                ownScore += addScore;
                if (!reasons.includes(finding.reason)) reasons.push(finding.reason);
            });
        }

        // Cap own score at 100
        ownScore = Math.min(ownScore, 100);

        // 3. Process children (children scored independently — no roll-up to parent)
        const processedDependencies = [];
        if (node.dependencies && Array.isArray(node.dependencies)) {
            node.dependencies.forEach(child => {
                processedDependencies.push(this.evaluateTreeScore(child));
            });
        }

        // Classification based ONLY on own score (not children)
        let classification = 'safe';
        if (ownScore >= 30)     classification = 'malicious';
        else if (ownScore > 5)  classification = 'warning';

        return {
            name: node.name,
            version: node.version,
            riskScore: Math.round(ownScore),
            classification,
            reasons,
            scanFindings: node.scanResults || [],
            dependencies: processedDependencies,
            isRoot: node.isRoot
        };
    }
}

module.exports = new RiskEngine();
