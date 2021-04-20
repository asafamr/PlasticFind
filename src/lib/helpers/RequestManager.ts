import axiosRetry from "axios-retry";
import axios from "axios";

export abstract class RequestManager {
  public constructor(protected cacheInvalidationVersion?: string) {}
  public abstract getJson<T>(
    url: string,
    options: {
      retries?: number;
      timeoutMs?: number;
      retryDelay?: number;
    }
  ): Promise<T>;
}

export class RequestManagerImp extends RequestManager {
  protected version: string;
  public constructor(protected cacheInvalidationVersion?:string) {
    super(cacheInvalidationVersion);
    axiosRetry(axios, { retries: 3, retryDelay: () => 30 });
  }
  protected setVersionCacheInvalidation(version: string) {
    this.version = version;
  }
  async getJson<T>(
    url: string,
    { retries = 0, timeoutMs = 0, retryDelay = 30 }
  ): Promise<T> {
    const abort = axios.CancelToken.source();

    const timeoutHandle =
      timeoutMs &&
      setTimeout(() => abort.cancel(`Timeout of ${timeoutMs}ms.`), timeoutMs);

    return axios
      .get(url + (this.cacheInvalidationVersion ? `?v=${this.cacheInvalidationVersion}` : ""), {
        cancelToken: abort.token,
        "axios-retry": {
          retryDelay: () => retryDelay,
          retries,
        },
      })
      .then((res) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        return res.data;
      });
  }
}
