export interface IRegisterUser {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
  roleName?: string;
}

export interface ILoginUser {
  email: string;
  password: string;
}

export interface IRefreshToken {
  refreshToken: string;
}
