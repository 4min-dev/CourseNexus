export function devAuthBypass(req, res, next) {
    if (process.env.AUTH_BYPASS === "true") {
        req.user = {
            claims: {
                sub: "dev-user-id",
            },
            isDevBypass: true,
        };
        return next();
    }

    next();
}