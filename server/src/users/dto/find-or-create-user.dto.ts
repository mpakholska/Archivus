export enum OAuthProvider {
  google = 'google',
  github = 'github',
}

export class FindOrCreateUserDto {
  provider: OAuthProvider;
  providerId: string; 
  fullName: string;
  email: string;
}
