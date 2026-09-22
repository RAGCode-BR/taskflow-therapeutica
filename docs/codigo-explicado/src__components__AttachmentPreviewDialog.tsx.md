# src/components/AttachmentPreviewDialog.tsx

Tipo: Componente ou rota React em TypeScript.

Este documento foi gerado para estudo e manutencao. Ele preserva o codigo original e explica linha por linha sem alterar o comportamento do sistema publicado.

| Linha | Codigo original | Explicacao |
| ---: | --- | --- |
| 1 | `import { useEffect, useState } from "react";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 2 | `import { supabase } from "@/integrations/supabase/client";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 3 | `import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 4 | `import { Button } from "@/components/ui/button";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 5 | `import { Download } from "lucide-react";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 6 | `import { toast } from "sonner";` | Importa bibliotecas, componentes, tipos ou funcoes usados neste arquivo. |
| 7 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 8 | `export interface PreviewableAttachment {` | Exporta valor, funcao, tipo ou componente para ser usado por outros arquivos. |
| 9 | `  file_name: string;` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 10 | `  storage_path: string;` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 11 | `  mime_type: string | null;` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 12 | `}` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 13 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 14 | `interface Props {` | Declara um contrato de tipos TypeScript para deixar os dados mais seguros e previsiveis. |
| 15 | `  open: boolean;` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 16 | `  onOpenChange: (open: boolean) => void;` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 17 | `  attachment: PreviewableAttachment | null;` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 18 | `}` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 19 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 20 | `export function AttachmentPreviewDialog({ open, onOpenChange, attachment }: Props) {` | Exporta valor, funcao, tipo ou componente para ser usado por outros arquivos. |
| 21 | `  const [blobUrl, setBlobUrl] = useState<string | null>(null);` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 22 | `  const [loading, setLoading] = useState(false);` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 23 | `  const [error, setError] = useState<string | null>(null);` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 24 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 25 | `  useEffect(() => {` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 26 | `    if (!open || !attachment) return;` | Inicia uma decisao condicional para tratar cenarios diferentes. |
| 27 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 28 | `    let active = true;` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 29 | `    let nextBlobUrl: string | null = null;` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 30 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 31 | `    setLoading(true);` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 32 | `    setError(null);` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 33 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 34 | `    (async () => {` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 35 | `      const { data, error } = await supabase.storage.from("task-attachments").download(attachment.storage_path);` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 36 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 37 | `      if (!active) return;` | Inicia uma decisao condicional para tratar cenarios diferentes. |
| 38 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 39 | `      if (error) {` | Inicia uma decisao condicional para tratar cenarios diferentes. |
| 40 | `        setError(error.message);` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 41 | `        setBlobUrl(null);` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 42 | `        setLoading(false);` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 43 | `        return;` | Devolve o resultado da funcao ou renderiza a interface do componente. |
| 44 | `      }` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 45 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 46 | `      nextBlobUrl = URL.createObjectURL(data);` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 47 | `      setBlobUrl(nextBlobUrl);` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 48 | `      setLoading(false);` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 49 | `    })();` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 50 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 51 | `    return () => {` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 52 | `      active = false;` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 53 | `      if (nextBlobUrl) URL.revokeObjectURL(nextBlobUrl);` | Inicia uma decisao condicional para tratar cenarios diferentes. |
| 54 | `    };` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 55 | `  }, [open, attachment]);` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 56 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 57 | `  const downloadCurrent = async () => {` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 58 | `    if (!attachment) return;` | Inicia uma decisao condicional para tratar cenarios diferentes. |
| 59 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 60 | `    try {` | Inicia bloco protegido para capturar erros durante a execucao. |
| 61 | `      const { data, error } = await supabase.storage.from("task-attachments").download(attachment.storage_path);` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 62 | `      if (error) throw error;` | Inicia uma decisao condicional para tratar cenarios diferentes. |
| 63 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 64 | `      const url = URL.createObjectURL(data);` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 65 | `      const a = document.createElement("a");` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 66 | `      a.href = url;` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 67 | `      a.download = attachment.file_name;` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 68 | `      document.body.appendChild(a);` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 69 | `      a.click();` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 70 | `      a.remove();` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 71 | `      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);` | Define uma funcao ou callback que sera executado quando a aplicacao precisar dessa logica. |
| 72 | `    } catch (err) {` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 73 | `      toast.error((err as Error).message);` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 74 | `    }` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 75 | `  };` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 76 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 77 | `  const mime = attachment?.mime_type ?? "";` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 78 | `  const isImage = mime.startsWith("image/");` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 79 | `  const isVideo = mime.startsWith("video/");` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 80 | `  const isAudio = mime.startsWith("audio/");` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 81 | `  const isPdf = mime === "application/pdf" || mime.includes("pdf");` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 82 | `  const isText = mime.startsWith("text/") || mime.includes("json");` | Cria uma variavel ou constante usada pela logica deste trecho. |
| 83 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 84 | `  return (` | Devolve o resultado da funcao ou renderiza a interface do componente. |
| 85 | `    <Dialog open={open} onOpenChange={onOpenChange}>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 86 | `      <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden p-0">` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 87 | `        <DialogHeader className="border-b px-6 py-4">` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 88 | `          <div className="flex items-center justify-between gap-3">` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 89 | `            <DialogTitle className="truncate text-sm">{attachment?.file_name ?? "Visualizar arquivo"}</DialogTitle>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 90 | `            <Button type="button" variant="outline" size="sm" onClick={downloadCurrent} disabled={!attachment}>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 91 | `              <Download className="mr-2 h-4 w-4" />Baixar` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 92 | `            </Button>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 93 | `          </div>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 94 | `        </DialogHeader>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 95 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 96 | `        <div className="flex min-h-[60vh] items-center justify-center bg-muted/20 p-4">` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 97 | `          {loading && <p className="text-sm text-muted-foreground">Carregando arquivo…</p>}` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 98 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 99 | `          {!loading && error && <p className="text-sm text-destructive">{error}</p>}` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 100 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 101 | `          {!loading && !error && blobUrl && isImage && (` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 102 | `            <img src={blobUrl} alt={attachment?.file_name ?? "Arquivo"} className="max-h-[78vh] w-auto max-w-full rounded-md object-contain" />` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 103 | `          )}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 104 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 105 | `          {!loading && !error && blobUrl && isPdf && (` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 106 | `            <iframe src={blobUrl} title={attachment?.file_name ?? "PDF"} className="h-[78vh] w-full rounded-md border bg-background" />` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 107 | `          )}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 108 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 109 | `          {!loading && !error && blobUrl && isVideo && (` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 110 | `            <video src={blobUrl} controls className="max-h-[78vh] w-full rounded-md bg-black" />` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 111 | `          )}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 112 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 113 | `          {!loading && !error && blobUrl && isAudio && (` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 114 | `            <audio src={blobUrl} controls className="w-full max-w-2xl" />` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 115 | `          )}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 116 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 117 | `          {!loading && !error && blobUrl && isText && (` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 118 | `            <iframe src={blobUrl} title={attachment?.file_name ?? "Arquivo de texto"} className="h-[78vh] w-full rounded-md border bg-background" />` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 119 | `          )}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 120 | `(linha em branco)` | Separa blocos de codigo para melhorar a leitura. |
| 121 | `          {!loading && !error && blobUrl && !isImage && !isPdf && !isVideo && !isAudio && !isText && (` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 122 | `            <div className="space-y-3 text-center">` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 123 | `              <p className="text-sm text-muted-foreground">Esse tipo de arquivo não tem preview embutido aqui.</p>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 124 | `              <Button type="button" onClick={downloadCurrent}>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 125 | `                <Download className="mr-2 h-4 w-4" />Baixar arquivo` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 126 | `              </Button>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 127 | `            </div>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 128 | `          )}` | Linha de implementacao que compoe a regra de negocio, a interface ou a configuracao do arquivo. |
| 129 | `        </div>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 130 | `      </DialogContent>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 131 | `    </Dialog>` | Renderiza elemento de interface React/JSX e aplica estilos ou propriedades. |
| 132 | `  );` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
| 133 | `}` | Fecha o bloco, objeto, funcao ou chamada iniciado nas linhas anteriores. |
