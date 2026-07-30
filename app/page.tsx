import { PersonalDeskApp } from "@/components/PersonalDeskApp";
import { TaskProvider } from "@/context/TaskContext";

export default function Home() {
  return (
    <TaskProvider>
      <PersonalDeskApp />
    </TaskProvider>
  );
}
