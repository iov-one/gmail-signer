interface GoogleAccessToken {
    readonly token: string;
    readonly expiresIn: number;
    readonly type: "Bearer";
    readonly scope: string[];
    readonly state: string;
}
