#!/usr/bin/env node
const {tokenizer, rewriter, generator} = require('./backend');
const childProcess = require('child_process');
const chalk = require('chalk');

function getBranches() {
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

function getRemotes() {
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

function currentBranch() {
  return new Promise((resolve, reject) => {
    childProcess.exec('git branch', (err, stderr, stdout) => {
      if (err) {
        reject(err);
      } else {
        const branch = `${stderr}${stdout}`.split('\n').find(b => b.startsWith('*'))
        resolve(branch.slice(2));
      }
    });
  });
}

Promise.all([
  getBranches(),
  getRemotes(),
  currentBranch(),
]).then(([
  branches,
  remotes,
  currentBranch,
]) => {
  // Create a list of entities
  const entities = [
    ...branches.map(name => ({type: 'branch', name})),
    ...remotes.map(name => ({type: 'remote', name})),
  ];

  // Parse the input
  const input = process.argv.slice(2).join(' ');
  const tokens = tokenizer(input);
  const rewritten = rewriter(entities, tokens);
  const output = generator(rewritten, currentBranch);

  console.log(`Running $ ${chalk.cyan(`git ${output}`)}`);

  // Spawn the git command, and execute:
  const spawned = childProcess.spawn('git', output.split(' '), {cwd: process.cwd()});
  spawned.stdout.on('data', d => console.log(d.toString()));
  spawned.stderr.on('data', d => console.log(chalk.red(d.toString())));

  spawned.on('close', code => {
    if (code === 0) {
      console.log(chalk.green(`Successfully pushed.`));
    } else {
      process.exit(code);
    }
  });
}).catch(err => {
  console.error(chalk.red('Error running command:'));
  console.error(err);
  process.exit(-1);
})
