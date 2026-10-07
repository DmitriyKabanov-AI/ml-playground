"use client";
import { TaskPage } from "@/components/shared/TaskPage";
import { getTask } from "@/lib/data/tasks";
export default function Page() { return <TaskPage task={getTask("bc-fn")} />; }
