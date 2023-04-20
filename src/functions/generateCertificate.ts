import { APIGatewayProxyHandler } from "aws-lambda"
import { S3 } from "aws-sdk"
import chromium from "chrome-aws-lambda";
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

  const response = await document.query({
    TableName: dynamo_table,
    KeyConditionExpression: "id = :id",
    ExpressionAttributeValues: {
      ":id": id
    }
  }).promise()

  const userAlreadyExists = response.Items[0];


  if (!userAlreadyExists) {
    await document.put({
      TableName: dynamo_table,
      Item: {
        id,
        name,
        grade,
        created_at: new Date().getTime()
      }
    }).promise()
  }

  const medalPath = join(process.cwd(), "src", "templates", "selo.png");
  const medal = readFileSync(medalPath, "base64");

  const data: ITemplate = {
    name,
    id,
    grade,
    date: new Date().toLocaleDateString("pt-BR"),
    medal
  }

  const content = await compileTemplate(data);

  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
  });

  const page = await browser.newPage();

  await page.setContent(content);
  const pdf = await page.pdf({
    format: "a4",
    landscape: true,
    printBackground: true,
    preferCSSPageSize: true,
    path: process.env.IS_OFFLINE ? "./certificate.pdf" : null
  })

  await browser.close();

  const s3 = new S3()

  await s3.putObject({
    Bucket: "certificate-gen-node",
    Key: `${id}.pdf`,
    ACL: "public-read",
    Body: pdf,
    ContentType: "application/pdf"
  }).promise()

  return {
    statusCode: 201,
    body: JSON.stringify({
      message: "Certificado criado com sucesso!",
      url: `https://certificate-gen-node.s3.amazonaws.com/${id}.pdf`
    })
  }
}