export const Logger = {
    currentLogLevel: 1,
    logLevels: {
        INFO: 1,
        DEBUG: 2
    },
    logType:{
        INTENTION: '\x1b[32mINTENTION \x1b[0m',
        PLAN: '\x1b[33mPLAN \x1b[0m',
        BELIEVES: '\x1b[34mBELIEVES \x1b[0m',
    },
    logEvent (type, level, message) {

        if (level >= this.currentLogLevel) {
            console.log(`${type} ${message}`);
        }
    }
}