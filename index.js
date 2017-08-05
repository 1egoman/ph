#!/usr/bin/env node
const {tokenizer, rewriter, generator} = require('./backend');
const childProcess = require('child_process');
const chalk = require('chalk');

const {getBranches, getRemotes, currentBranch} = require('./helpers/getEntities');

function main() {
  return Promise.all([
    getBranches(childProcess),
    getRemotes(childProcess),
    currentBranch(childProcess),
  ]).then(([branches, remotes, currentBranch]) => {
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
    spawned.stderr.on('data', d => console.log(d.toString()));

    spawned.on('close', code => {
      if (code === 0) {
        console.log(chalk.green(`Successfully pushed.`));
      } else {
        process.exit(code);
      }
    });
  });
}

if (require.main === module) {
  main().catch(err => {
    console.error(chalk.red('Error running command:'));
    console.error(err);
    process.exit(-1);
  });
}
