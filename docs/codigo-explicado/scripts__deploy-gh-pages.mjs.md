# scripts/deploy-gh-pages.mjs

Tipo: Script JavaScript.

Este documento foi gerado para estudo e manutencao. Ele preserva o codigo original e explica linha por linha sem alterar o comportamento do sistema publicado.

| Linha | Codigo original | Explicacao |
| ---: | --- | --- |
| 1 | `import { spawnSync } from "node:child_process";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 2 | `import { cp, mkdir, rm } from "node:fs/promises";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 3 | `import { existsSync } from "node:fs";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 4 | `import path from "node:path";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 5 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 6 | `const pagesDir = path.resolve(".gh-pages-dist");` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 7 | `const publishDir = path.resolve(".gh-pages-worktree");` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 8 | `const publicUrl = "https://r3eiz.github.io/task-flow-supabase-clean/";` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 9 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 10 | `const run = (command, args, options = {}) => {` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 11 | `  const result = spawnSync(command, args, {` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 12 | `    stdio: "inherit",` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 13 | `    ...options,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 14 | `  });` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 15 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 16 | `  if (result.status !== 0) {` | Inicia uma decisao condicional para tratar cenarios diferentes. |
| 17 | `    throw new Error(\`${command} ${args.join(" ")} failed\`);` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 18 | `  }` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 19 | `};` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 20 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 21 | `if (!existsSync(pagesDir)) {` | Inicia uma decisao condicional para tratar cenarios diferentes. |
| 22 | `  throw new Error("Missing .gh-pages-dist. Run npm run build:pages first.");` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 23 | `}` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 24 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 25 | `// The deploy uses a temporary git worktree so the app source branch and the generated` | Comentario existente no codigo; registra uma observacao para quem esta lendo ou mantendo o arquivo. |
| 26 | `// gh-pages branch never mix files. That is important here because this repo is a clean` | Comentario existente no codigo; registra uma observacao para quem esta lendo ou mantendo o arquivo. |
| 27 | `// copy and should stay easy to compare against the Lovable/original project.` | Comentario existente no codigo; registra uma observacao para quem esta lendo ou mantendo o arquivo. |
| 28 | `await rm(publishDir, { recursive: true, force: true });` | Espera uma operacao assincrona terminar, como chamada ao Supabase ou processamento externo. |
| 29 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 30 | `const hasRemoteBranch = spawnSync("git", ["ls-remote", "--exit-code", "--heads", "origin", "gh-pages"], {` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 31 | `  stdio: "ignore",` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 32 | `}).status === 0;` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 33 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 34 | `if (hasRemoteBranch) {` | Inicia uma decisao condicional para tratar cenarios diferentes. |
| 35 | `  run("git", ["worktree", "add", publishDir, "gh-pages"]);` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 36 | `} else {` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 37 | `  await mkdir(publishDir, { recursive: true });` | Espera uma operacao assincrona terminar, como chamada ao Supabase ou processamento externo. |
| 38 | `  run("git", ["worktree", "add", "--detach", publishDir, "HEAD"]);` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 39 | `  run("git", ["checkout", "--orphan", "gh-pages"], { cwd: publishDir });` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 40 | `}` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 41 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 42 | `run("git", ["rm", "-rf", "."], { cwd: publishDir });` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 43 | `await cp(pagesDir, publishDir, { recursive: true, force: true });` | Espera uma operacao assincrona terminar, como chamada ao Supabase ou processamento externo. |
| 44 | `run("git", ["add", "."], { cwd: publishDir });` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 45 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 46 | `const diff = spawnSync("git", ["diff", "--cached", "--quiet"], {` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 47 | `  stdio: "ignore",` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 48 | `  cwd: publishDir,` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 49 | `});` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 50 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 51 | `if (diff.status === 0) {` | Inicia uma decisao condicional para tratar cenarios diferentes. |
| 52 | `  console.log("No GitHub Pages changes to publish.");` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 53 | `} else {` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 54 | `  run("git", ["commit", "-m", "Deploy GitHub Pages"], { cwd: publishDir });` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 55 | `  run("git", ["push", "origin", "gh-pages"], { cwd: publishDir });` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 56 | `}` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 57 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 58 | `run("git", ["worktree", "remove", publishDir, "--force"]);` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 59 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 60 | `console.log(\`GitHub Pages published: ${publicUrl}\`);` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 61 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
