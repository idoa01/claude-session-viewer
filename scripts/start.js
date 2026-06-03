#!/usr/bin/env node
import { copyFileSync } from 'fs'
import { resolve } from 'path'
import { spawn } from 'child_process'

const fileArg = process.argv.find(a => a.startsWith('--file='))
if (fileArg) {
  const src = resolve(process.cwd(), fileArg.slice('--file='.length))
  const dest = resolve(process.cwd(), 'public/session.jsonl')
  copyFileSync(src, dest)
  console.log(`Loaded: ${src}`)
}

const vite = spawn('npx', ['vite'], { stdio: 'inherit', shell: true })
vite.on('exit', code => process.exit(code ?? 0))
