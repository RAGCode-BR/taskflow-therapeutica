import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outputRoot = path.join(root, "docs", "codigo-explicado");
const includedRoots = ["src", "scripts", "supabase", "docs"];
const includedRootFiles = [
  "bunfig.toml",
  "components.json",
  "eslint.config.js",
  "index.pages.html",
  "package.json",
  "tsconfig.json",
  "vite.config.ts",
  "vite.pages.config.ts",
];
const allowedExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".css",
  ".sql",
  ".md",
  ".toml",
  ".json",
]);

const skippedNames = new Set(["node_modules", ".git", "dist", "build", ".vite"]);

function walk(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (skippedNames.has(entry.name)) continue;

    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (entry.isFile() && allowedExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function normalizeRelative(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, "/");
}

function markdownCode(value) {
  if (value.length === 0) return "`(linha em branco)`";
  return `\`${value.replaceAll("`", "\\`")}\``;
}

function titleForFile(relativePath) {
  if (relativePath.endsWith(".tsx")) return "Componente ou rota React em TypeScript";
  if (relativePath.endsWith(".ts")) return "Modulo TypeScript";
  if (relativePath.endsWith(".mjs") || relativePath.endsWith(".js")) return "Script JavaScript";
  if (relativePath.endsWith(".sql")) return "Migration SQL do Supabase";
  if (relativePath.endsWith(".css")) return "Folha de estilos CSS";
  if (relativePath.endsWith(".toml")) return "Arquivo de configuracao TOML";
  if (relativePath.endsWith(".json")) return "Arquivo de configuracao JSON";
  if (relativePath.endsWith(".md")) return "Documento Markdown";
  return "Arquivo do projeto";
}

function explainLine(rawLine, relativePath) {
  const line = rawLine.trim();
  const extension = path.extname(relativePath);

  if (line.length === 0) {
    return "Separa blocos de codigo para melhorar a leitura.";
  }

  if (line.startsWith("//") || line.startsWith("/*") || line.startsWith("*")) {
    return "Comentario existente no codigo; registra uma observacao para quem esta lendo ou mantendo o arquivo.";
  }

  if (extension === ".css") return explainCssLine(line);
  if (extension === ".sql") return explainSqlLine(line);
  if (extension === ".md") return explainMarkdownLine(line);
  if (extension === ".toml" || extension === ".json") return explainConfigLine(line);

  return explainCodeLine(line);
}

function explainCssLine(line) {
  if (line.startsWith("@import")) return "Importa estilos externos ou camadas usadas pela aplicacao.";
  if (line.startsWith("@tailwind")) return "Ativa uma camada do Tailwind CSS para gerar utilitarios de estilo.";
  if (line.endsWith("{")) return "Inicia um bloco de regras CSS para o seletor indicado.";
  if (line === "}") return "Fecha o bloco de regras CSS aberto anteriormente.";
  if (line.includes(":")) return "Define uma propriedade visual, como cor, tamanho, espacamento ou comportamento de layout.";
  return "Participa da definicao visual da interface.";
}

function explainSqlLine(line) {
  const upper = line.toUpperCase();
  if (line.startsWith("--")) return "Comentario da migration; explica a intencao daquele trecho SQL.";
  if (upper.startsWith("CREATE TABLE")) return "Cria uma tabela no banco de dados Supabase/PostgreSQL.";
  if (upper.startsWith("ALTER TABLE")) return "Altera uma tabela existente, normalmente adicionando campos, chaves ou politicas.";
  if (upper.startsWith("CREATE POLICY")) return "Cria uma regra de seguranca RLS para controlar acesso aos dados.";
  if (upper.includes("ENABLE ROW LEVEL SECURITY")) return "Ativa Row Level Security para proteger linhas da tabela por usuario/regra.";
  if (upper.startsWith("CREATE INDEX")) return "Cria indice para acelerar consultas frequentes.";
  if (upper.startsWith("INSERT INTO")) return "Insere dados iniciais ou registros de apoio.";
  if (upper.startsWith("UPDATE")) return "Atualiza registros existentes no banco.";
  if (upper.startsWith("SELECT")) return "Consulta dados ou valida uma condicao no banco.";
  if (upper.startsWith("CREATE OR REPLACE FUNCTION") || upper.startsWith("CREATE FUNCTION")) return "Define uma funcao no banco para reutilizar logica SQL.";
  if (upper.startsWith("CREATE TRIGGER")) return "Cria gatilho que executa uma funcao automaticamente em eventos da tabela.";
  if (upper.startsWith("DROP")) return "Remove objeto antigo para permitir recriacao ou limpeza controlada.";
  if (upper.includes("REFERENCES")) return "Define relacionamento entre tabelas por chave estrangeira.";
  if (upper.includes("PRIMARY KEY")) return "Define identificador unico principal do registro.";
  return "Executa parte da mudanca estrutural ou de seguranca do banco.";
}

function explainMarkdownLine(line) {
  if (line.startsWith("#")) return "Titulo ou subtitulo usado para organizar a documentacao.";
  if (line.startsWith("- ")) return "Item de lista com uma orientacao, decisao ou observacao.";
  if (line.startsWith("```")) return "Marca inicio ou fim de um bloco de codigo.";
  if (line.includes("http")) return "Referencia um link externo ou endereco importante.";
  return "Texto explicativo da documentacao.";
}

function explainConfigLine(line) {
  if (line.startsWith("{") || line.startsWith("}") || line.startsWith("[") || line.startsWith("]")) {
    return "Abre ou fecha uma estrutura de configuracao.";
  }
  if (line.includes("=") || line.includes(":")) {
    return "Define uma opcao de configuracao usada por ferramenta, build ou ambiente.";
  }
  return "Participa da configuracao do projeto.";
}

function explainCodeLine(line) {
  if (/^import\s/.test(line)) return "Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo.";
  if (/^export\s/.test(line)) return "Exporta valor, funcao, tipo ou componente para ser usado por outros arquivos.";
  if (/^interface\s/.test(line) || /^type\s/.test(line)) return "Declara um contrato de tipos TypeScript para deixar os dados mais seguros e previsiveis.";
  if (/^(const|let|var)\s/.test(line)) return "Cria uma variavel ou constante usada pela logica deste trecho.";
  if (/^function\s/.test(line) || line.includes("=>")) return "Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica.";
  if (line.startsWith("return")) return "Devolve o resultado da funcao ou renderiza a interface do componente.";
  if (line.startsWith("if ")) return "Inicia uma decisao condicional para tratar cenarios diferentes.";
  if (line.startsWith("else")) return "Define o caminho alternativo da condicao anterior.";
  if (line.startsWith("for ") || line.startsWith("while ")) return "Inicia uma repeticao sobre dados ou condicoes.";
  if (line.startsWith("try")) return "Inicia bloco protegido para capturar erros durante a execucao.";
  if (line.startsWith("catch")) return "Trata erros gerados no bloco protegido anterior.";
  if (line.startsWith("await ")) return "Espera uma operacao assincrona terminar, como chamada ao Supabase ou processamento externo.";
  if (line.includes("useState")) return "Cria estado React para armazenar valores que mudam na tela.";
  if (line.includes("useEffect")) return "Executa efeito React quando o componente carrega ou quando dependencias mudam.";
  if (line.includes("useMemo")) return "Memoriza um valor calculado para evitar processamento desnecessario.";
  if (line.includes("useCallback")) return "Memoriza uma funcao para evitar recriacoes desnecessarias.";
  if (line.includes("supabase")) return "Interage com o cliente Supabase para autenticar ou acessar o banco.";
  if (line.startsWith("<") || line.includes("className=")) return "Renderiza elemento de interface React/JSX e aplica estilos ou propriedades.";
  if (line === "}" || line === "};" || line === ");" || line === "}" || line === "}," || line === "});") {
    return "Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores.";
  }
  return "Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo.";
}

function outputPathFor(relativePath) {
  return path.join(outputRoot, `${relativePath.replaceAll("/", "__")}.md`);
}

function buildExplanation(filePath) {
  const relativePath = normalizeRelative(filePath);
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  const header = [
    `# ${relativePath}`,
    "",
    `Tipo: ${titleForFile(relativePath)}.`,
    "",
    "Este documento foi gerado para estudo e manutencao. Ele preserva o codigo original e explica linha por linha sem alterar o comportamento do sistema publicado.",
    "",
    "| Linha | Codigo original | Explicacao |",
    "| ---: | --- | --- |",
  ];

  const body = lines.map((line, index) => {
    return `| ${index + 1} | ${markdownCode(line)} | ${explainLine(line, relativePath)} |`;
  });

  return `${header.concat(body).join("\n")}\n`;
}

function main() {
  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });

  const sourceFiles = includedRoots.flatMap((sourceRoot) => {
    const absoluteRoot = path.join(root, sourceRoot);
    return fs.existsSync(absoluteRoot) ? walk(absoluteRoot) : [];
  });

  for (const rootFile of includedRootFiles) {
    const absoluteRootFile = path.join(root, rootFile);
    if (fs.existsSync(absoluteRootFile)) {
      sourceFiles.push(absoluteRootFile);
    }
  }

  const generatedFiles = [];

  for (const filePath of sourceFiles) {
    const relativePath = normalizeRelative(filePath);
    const target = outputPathFor(relativePath);
    fs.writeFileSync(target, buildExplanation(filePath), "utf8");
    generatedFiles.push({ relativePath, target: normalizeRelative(target) });
  }

  const index = [
    "# Codigo explicado",
    "",
    "Esta pasta contem uma explicacao linha a linha dos arquivos de codigo, configuracao, SQL e documentacao do projeto.",
    "",
    "A explicacao fica separada do codigo real para que o sistema continue funcionando no GitHub Pages e para que arquivos gerados ou de biblioteca nao sejam quebrados por comentarios manuais.",
    "",
    "## Arquivos",
    "",
    ...generatedFiles
      .sort((a, b) => a.relativePath.localeCompare(b.relativePath))
      .map((file) => `- [${file.relativePath}](./${path.basename(file.target)})`),
    "",
  ].join("\n");

  fs.writeFileSync(path.join(outputRoot, "README.md"), index, "utf8");
  console.log(`Gerados ${generatedFiles.length} arquivos de explicacao em ${normalizeRelative(outputRoot)}.`);
}

main();
