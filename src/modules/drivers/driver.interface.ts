export interface AssignRouteDTO{
    current_route_id: number;
}

export interface loginDriver {
    email: string;
    username: string;
    password: string;
}

export interface Driver{
    full_name?: string;
    username: string;
    email: string;
    passwrd: string;
    phone?: number;
}