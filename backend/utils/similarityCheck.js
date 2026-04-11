const popularPackages = [
    'express', 'react', 'lodash', 'chalk', 'commander', 'moment', 'tslib', 'react-dom',
    'axios', 'debug', 'eslint', 'prettier', 'jest', 'webpack', 'dotenv', 'mongoose',
    'typescript', 'vue', 'angular', 'next', 'rxjs', 'request', 'yargs', 'uuid', 'bluebird',
    'body-parser', 'cors'
];

// Calculate Levenshtein distance
function getEditDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
                                        Math.min(matrix[i][j - 1] + 1, // insertion
                                                 matrix[i - 1][j] + 1)); // deletion
            }
        }
    }

    return matrix[b.length][a.length];
}

exports.checkTyposquatting = (packageName) => {
    // If it's literally the popular package, it's not typosquatting
    if (popularPackages.includes(packageName)) {
        return null;
    }

    for (let target of popularPackages) {
        let distance = getEditDistance(packageName, target);
        // If distance is 1 or 2 and package name is relatively long enough, it might be typosquatting
        if (distance <= 2 && packageName.length > 4 && target.length > 4) {
            return `Similar to popular package '${target}' (Possible Typosquatting)`;
        }
    }
    
    return null;
};
