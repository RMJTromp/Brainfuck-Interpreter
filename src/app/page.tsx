import {Button} from "@/components/ui/button";
import Interpreter from "@/components/interpreter";

export default function Home() {
    return (
        <main>
            <header className="my-8">
                <div className="mx-auto px-5">
                    hello world
                </div>
            </header>
            <section id="interpreter" className="my-8">
                <div className="mx-auto px-5">
                    <Interpreter/>
                </div>
            </section>
        </main>
    );
}