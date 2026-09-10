import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    return res.status(200).send("Ok");
  } else {
    return res.status(405).send({ error: "method not allowed" });
  }
}
