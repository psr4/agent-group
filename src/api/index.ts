import { Hono } from "hono"
import groups from "./groups.js"
import agents from "./agents.js"
import models from "./models.js"
import { errorHandler } from "../utils/errors.js"

const app = new Hono()

app.onError(errorHandler)

app.route("/groups", groups)
app.route("/agents", agents)
app.route("/models", models)

export default app
