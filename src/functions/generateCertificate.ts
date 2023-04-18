import { APIGatewayProxyHandler } from "aws-lambda"
import { document } from "../../utils/dynamodbClient"

interface ICreateCertificate {
  id: string;
  name: string;
  grade: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const { id, name, grade } = JSON.parse(event.body) as ICreateCertificate

  const dynamo_table = "users_certificate"

  await document.put({
    TableName: dynamo_table,
    Item: {
      id,
      name,
      grade,
      created_at: new Date().getTime()
    }
  }).promise()

  const response = await document.query({
    TableName: dynamo_table,
    KeyConditionExpression: "id = :id",
    ExpressionAttributeValues: {
      ":id": id
    }
  }).promise()

  return {
    statusCode: 201,
    body: JSON.stringify(
      response.Items[0]
    )
  }
}