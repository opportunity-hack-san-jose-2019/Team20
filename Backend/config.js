module.exports = {
    jwtsecret: "",
    encrAlgorithm: "",
    encrSecret: "",
    sql_host: "",
    sql_port: "",
    sql_user: "",
    sql_password: "",
    sql_database: "",
    sql_connectionLimit: 10,
    initDb: process.env.INITDB === "",
};
