export function useServerFn<TFn extends (...args: Array<any>) => any>(_fn: TFn) {
  return async () => {
    throw new Error("Esta funcao precisa de servidor e nao esta disponivel no GitHub Pages.");
  };
}

export function createServerFn() {
  const builder = {
    middleware() {
      return builder;
    },
    validator() {
      return builder;
    },
    inputValidator() {
      return builder;
    },
    outputValidator() {
      return builder;
    },
    handler() {
      return async () => {
        throw new Error("Esta funcao precisa de servidor e nao esta disponivel no GitHub Pages.");
      };
    },
  };

  return builder;
}

export function createMiddleware() {
  return {
    server(handler: unknown) {
      return handler;
    },
  };
}

export function createStart() {
  return {
    getOptions() {
      return {};
    },
  };
}

export function getRequest() {
  return undefined;
}
