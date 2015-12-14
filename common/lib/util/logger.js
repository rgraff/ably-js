var Logger = (function() {
	var consoleLogger = console && function() { console.log.apply(console, arguments); };

	var LOG_NONE  = 0,
	LOG_ERROR = 1,
	LOG_MAJOR = 2,
	LOG_MINOR = 3,
	LOG_MICRO = 4;

	var LOG_DEFAULT = LOG_MAJOR,
	LOG_DEBUG   = LOG_MICRO;

	var logLevel = LOG_DEFAULT;
	var logHandler = consoleLogger;

	/* public constructor */
	function Logger(args) {}

	/* public constants */
	Logger.LOG_NONE    = LOG_NONE,
	Logger.LOG_ERROR   = LOG_ERROR,
	Logger.LOG_MAJOR   = LOG_MAJOR,
	Logger.LOG_MINOR   = LOG_MINOR,
	Logger.LOG_MICRO   = LOG_MICRO;

	Logger.LOG_DEFAULT = LOG_DEFAULT,
	Logger.LOG_DEBUG   = LOG_DEBUG;

	/* public static functions */
	Logger.logAction = function(level, action, message) {
		if (Logger.shouldLog(level)) {
			logHandler('Ably: ' + action + ': ' + message);
		}
	};

	Logger.deprecated = function(original, replacement) {
		if (Logger.shouldLog(LOG_ERROR)) {
			logHandler("Ably: Deprecation warning - '" + original + "' is deprecated and will be removed from a future version. Please use '" + replacement + "' instead.");
		}
	}

	/* Where a logging operation is expensive, such as serialisation of data, use shouldLog will prevent
	   the object being serialised if the log level will not output the message */
	Logger.shouldLog = function(level) {
		return level <= logLevel;
	};

	Logger.setLog = function(level, handler) {
		if(level !== undefined) logLevel = level;
		if(handler !== undefined) logHandler = handler;
	};

	return Logger;
})();
