
export interface Admin {
    full_name?: string;
    username: string;
    email: string;
    passwrd: string;
    phone?: number;
}

export interface loginAdmin {
    email: string;
    username: string;
    password: string;
}
