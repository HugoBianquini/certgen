import { APIGatewayProxyHandler } from "aws-lambda"
import { compile } from "handlebars"
import { document } from "../utils/dynamodbClient"
import { join } from "path";
import { readFileSync } from "fs";

interface ICreateCertificate {
  id: string;
  name: string;
  grade: string;
}

interface ITemplate {
  id: string;
  name: string;
  grade: string;
  medal: string;
  date: string;
}

const compileTemplate = async (data: ITemplate) => {
  const filePath = join(process.cwd(), "src", "templates", "certificate.hbs")

  const html = readFileSync(filePath, "utf-8");

  const compiledHtml = compile(html);

  return compiledHtml(data);
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

  const medalPath = join(process.cwd(), "src", "templates", "selo.png");
  const medal = readFileSync(medalPath, "base64");

  const data: ITemplate = {
    name,
    id,
    grade,
    date: new Date().toLocaleDateString("pt-BR"),
    medal
  }

  const content = await compileTemplate(data)

  return {
    statusCode: 201,
    body: JSON.stringify(
      response.Items[0]
    )
  }
}