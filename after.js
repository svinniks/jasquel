if (environment.db)
    for (var dbName in environment.db) {
        this[dbName].rollback();
        this[dbName].user();
    }