import { generateClient } from "aws-amplify/data";

function getClient() {
  return generateClient();
}

function assertNoErrors(result) {
  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(", "));
  }
}

export async function getTodos() {
  const client = getClient();

  const result = await client.models.Todo.list();

  assertNoErrors(result);

  return result.data;
}
export async function createTodo(title) {
  const client = getClient();

  const result = await client.models.Todo.create({
    title,
  });

  assertNoErrors(result);

  return result.data;
}
export async function updateTodo(id, done) {
  const client = getClient();

  const result = await client.models.Todo.update({
    id,
    done,
  });

  assertNoErrors(result);

  return result.data;
}

export async function deleteTodo(id) {
  const client = getClient();

  const result = await client.models.Todo.delete({
    id,
  });

  assertNoErrors(result);
}
