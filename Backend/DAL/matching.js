const _tableName1 = 'Student';
const _tableName2 = 'Interviewer';

const getMatching = connection => (person = {}) => {
    const {Student_ID, Interviewer_ID } = person;
    let query = `select * from ${_tableName1} INNER JOIN ${_tableName2} ON ${_tableName1}.Career_Interests = ${_tableName2}.Career_Fields where ${_tableName2}.Available = 1 LIMIT 1`;
    const clause = [];

    if (Student_ID) {
        clause.push(`Student_ID='${Student_ID}'`);
    }
    if (Interviewer_ID) {
        clause.push(`Interviewer_ID='${Interviewer_ID}'`);
    }


    query += clause.length > 0 ? ` where ${clause.join(' and ')}` : ''
    return new Promise((resolve, reject) => {
        connection.query(query, (error, results, fields) => {
            // release connection first!
            connection.release();

            if (error) {
                reject(error);
            } else {
                resolve({ results, fields });
            }
        });
    });
};

const saveInterviewDetails = connection => interviewDetails => {
    const { Interviewer_Id ,
        Student_Id ,
        Location ,
        Time ,
        Status } = interviewDetails;
    let query = `INSERT INTO Interview_Details(Interviewer_Id, Student_Id, Location, Time, Status) VALUES ('${Interviewer_Id}','${Student_Id}', '${Location}','${Time}', '${Status}' )`;
    
    return new Promise((resolve, reject) => {
        connection.query(query, (error, results, fields) => {
            // release connection first!
            connection.release();

            if (error) {
                reject(error);
            } else {
                resolve({ results, fields });
            }
        });
    });
};

module.exports = {
    getMatching,
    saveInterviewDetails
    

};