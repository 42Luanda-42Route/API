export interface Cadete {
    full_name?: string;
    username: string;
    email: string;
    passwrd: string;
    city?: string;
    distrit?: string;
    phone?: number;
    stop_id?: number;
}
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