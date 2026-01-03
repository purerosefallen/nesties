import { createMutateInject } from '../utility';
import { ApiFromProvider } from '../utility/api-from-provider';

export const ApiInject = createMutateInject((token, cls) => {
  ApiFromProvider(token)(cls);
  return token;
});
