import { APIGatewayProxyHandler } from "aws-lambda";
import { document } from "../utils/dynamodbClient";

const dynamo_table = "users_certificate"

interface IUserCertificate {
  name: string;
  id: string;
  created_at: string;
  grade: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const { id } = event.pathParameters;

  const response = await document.query({
    TableName: dynamo_table,
    KeyConditionExpression: "id = :id",
    ExpressionAttributeValues: {
      ":id": id
    }
  }).promise()


  const userCertificate = response.Items[0] as IUserCertificate

  if (userCertificate) {
    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Certificado válido",
        name: userCertificate.name,
        url: `https://certificate-gen-node.s3.amazonaws.com/${userCertificate.id}.pdf`
      })
    }
  }

  return {
    statusCode: 400,
    body: JSON.stringify({
      message: "Certificado inválido!",
    })
  }

}