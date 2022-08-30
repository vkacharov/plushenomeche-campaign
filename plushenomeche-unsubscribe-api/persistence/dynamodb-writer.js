const AWS = require('aws-sdk'); 
const documentClient = new AWS.DynamoDB.DocumentClient();

exports.putUnsubscribeEvent = async (tableName, unsubscribeEvent) => {
    var params = {
        TableName : tableName,
        Item: unsubscribeEvent
      };
    const result = await documentClient.put(params).promise();
    return result;
}