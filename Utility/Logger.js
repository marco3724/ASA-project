export const Logger = {
    currentLogLevel: 2,
    logLevels: {
        INFO: 2,
        DEBUG: 1
    },
    logType:{
        INTENTION: '\x1b[32mINTENTION \x1b[0m',
        PLAN: '\x1b[33mPLAN \x1b[0m',
        BELIEVES: '\x1b[34mBELIEVES \x1b[0m',
        COMMUNICATION: '\x1b[35mCOMMUNICATION \x1b[0m',
    },
    logEvent (type, level, message) {

        if (level >= this.currentLogLevel) {
            console.log(`${type} ${message}`);
        }
    }
}