// Return an array of all branches.
module.exports.getBranches = function getBranches(childProcess) {
  return new Promise((resolve, reject) => {
    childProcess.exec('git branch', (err, stderr, stdout) => {
      if (err) {
        reject(err);
      } else {
        const branches = `${stderr}${stdout}`.split('\n').map(b => b.slice(2)).filter(b => b.length);
        resolve(branches);
      }
    });
  });
}

// Return an array of all remotes.
module.exports.getRemotes = function getRemotes(childProcess) {
  return new Promise((resolve, reject) => {
    childProcess.exec('git remote', (err, stderr, stdout) => {
      if (err) {
        reject(err);
      } else {
        const remotes = `${stderr}${stdout}`.split('\n')
        resolve(remotes);
      }
    });
  });
}

// A function that returns the currently checked out branch.
// 1. If no branch is checked out, the `undefined` is resolved.
// 2. If the user instead has another type of thing checked out (ie, a commit SHA for example) then
// this function will resolve `undefined`.
module.exports.currentBranch = function currentBranch(childProcess) {
  return new Promise((resolve, reject) => {
    childProcess.exec('git branch', (err, stderr, stdout) => {
      if (err) {
        reject(err);
      } else {
        const branch = `${stderr}${stdout}`.split('\n').find(b => b.startsWith('*'));
        if (branch === null) {
          resolve(undefined);
        } else {
          // Remove the `* ` before the branch name that indicates that it was the selected branch.
          const branchName = branch.slice(2);
          if (branch.indexOf(' ') !== -1) {
            // The user checked out a ref that isn't a branch.
            resolve(undefined);
          } else {
            resolve(branchName);
          }
        }
      }
    });
  });
}
