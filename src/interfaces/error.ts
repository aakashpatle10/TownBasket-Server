export type IErrorSource = {
  path: string | number;
  message: string;
};

export type IGenericErrorResponse = {
  statusCode: number;
  message: string;
  errorSources: IErrorSource[];
};
