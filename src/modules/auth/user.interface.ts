export interface IntraProfile {
  id: number;
  login: string;
  email: string;
  displayname?: string;
  image_url?: string;
}

export interface IUser {
  id: number;
  intraId: number;
  email: string;
  username: string;
  
  role: string;
}
