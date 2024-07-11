#!/usr/bin/env node

import os from 'os';
import fs from 'fs';
import url from 'url';
import chalk from 'chalk';

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { program } from 'commander';

const log = console.log;
const error = (...args) => log.apply(this, [chalk.bgRed('ERROR')].concat(args.map(a => chalk.red(a))));
const sleep = (t) => new Promise(resolve => setTimeout(resolve, t * 1000));
const currentDir = dirname(url.fileURLToPath(import.meta.url));
const pipyBinName = os.platform() === 'win32' ? '..\\..\\bin\\Release\\pipy.exe' : '../../bin/pipy';
const pipyBinPath = join(currentDir, pipyBinName);
const hexMap = new Array(256).fill().map((_, i) => (i < 16 ? '0' + i.toString(16) : i.toString(16)));
const charMap = new Array(256).fill().map((_, i) => (0x20 <= i && i < 0x80 ? String.fromCharCode(i) : '.'));
const testResults = {};

function startProcess(cmd, args, cwd, onStderr, onStdout) {
  const proc = spawn(cmd, args, { cwd });
  const lineBuffer = [];
  proc.stderr.on('data', data => {
    let i = 0, n = data.length;
    while (i < n) {
      let j = i;
      while (j < n && data[j] !== 10) j++;
      if (j > i) lineBuffer.push(data.slice(i, j));
      if (j < n) {
        const line = Buffer.concat(lineBuffer).toString();
        lineBuffer.length = 0;
        onStderr(line);
      }
      i = j + 1;
    }
  });
  proc.stdout.on('data', onStdout);
  return proc;
}

function startPipy(filename, cwd, onStdout) {
  return startProcess(
    pipyBinPath, ['--no-graph', filename], cwd,
    line => log(chalk.bgGreen('worker >>>'), line),
    onStdout
  );
}

function diff(a, b) {
  const sizeA = a.byteLength;
  const sizeB = b.byteLength;
  const size = Math.max(sizeA, sizeB);
  for (let row = 0; row < size; row += 16) {
    const bytesL = [];
    const bytesR = [];
    const charsL = [];
    const charsR = [];
    for (let col = 0; col < 16; col++) {
      const i = row + col;
      const same = (a[i] === b[i]);
      if (i < sizeA) {
        const hex = hexMap[a[i]];
        const chr = charMap[a[i]];
        bytesL.push(same ? hex : chalk.bgGreen(hex));
        charsL.push(same ? chr : chalk.bgGreen(chr));
      } else {
        bytesL.push('  ');
        charsL.push(' ');
      }
      if (i < sizeB) {
        const hex = hexMap[b[i]];
        const chr = charMap[b[i]];
        bytesR.push(same ? hex : chalk.bgRed(hex));
        charsR.push(same ? chr : chalk.bgRed(chr));
      } else {
        bytesR.push('  ');
        charsR.push(' ');
      }
      if (col == 7) {
        bytesL.push('');
        charsL.push(' ');
        bytesR.push('');
        charsR.push(' ');
      }
    }
    let addr = row.toString(16);
    if (addr.length < 8) addr = '0'.repeat(8 - addr.length) + addr;
    log(`${addr}  ${bytesL.join(' ')}  |${charsL.join('')}|  ${bytesR.join(' ')}  |${charsR.join('')}|`);
  }
}

async function runTest(name) {
  const basePath = join(currentDir, name);

  let worker;
  try {
    log(`Testing ${chalk.cyan(name)}...`);
    const stdoutBuffer = [];
    worker = startPipy(
      `${basePath}/main.js`, basePath,
      data => stdoutBuffer.push(data)
    );

    await Promise.race([
      new Promise(
        resolve => {
          worker.on('exit', code => {
            log('Worker exited with code', code);
            resolve();
          })
        }
      ),
      sleep(10).then(() => { throw new Error('Worker did not quit timely'); }),
    ]);

    const stdout = Buffer.concat(stdoutBuffer);
    const expected = fs.readFileSync(`${basePath}/output`);
    if (Buffer.compare(stdout, expected)) {
      testResults[name] = false;
      diff(expected, stdout);
      error(`Test ${name} did not output expected data`);
    } else {
      testResults[name] = true;
      log(`Test ${chalk.cyan(name)} OK`);
    }

  } catch (e) {
    testResults[name] = false;
    if (worker) worker.kill();
    throw e;
  }
}

async function start(id) {
  try {
    if (id) {
      await runTest(id);
      summary();

    } else {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true }).filter(e => e.isDirectory());
      for (const ent of entries) {
        await runTest(ent.name);
      }
      summary();
    }

  } catch (e) {
    error(e.message);
    log(e);
    process.exit(-1);
  }

  log('All tests done.');
  process.exit(0);
}

function summary() {
  const maxWidth = Math.max.apply(null, Object.keys(testResults).map(name => name.length));
  const width = maxWidth + 20;
  log('='.repeat(width));
  log('Summary');
  log('-'.repeat(width));
  Object.keys(testResults).sort().forEach(
    name => {
      if (testResults[name]) {
        log(name + ' '.repeat(width - 2 - name.length) + chalk.green('OK'));
      } else {
        log(name + ' '.repeat(width - 4 - name.length) + chalk.red('FAIL'));
      }
    }
  );
  log('='.repeat(width));
}

program
  .argument('[testcase-id]')
  .action(id => start(id))
  .parse(process.argv)
