import {Canvas} from "@react-three/fiber";
import Model from "@/components/Model";
import {Environment} from "@react-three/drei";

export default function Scene() {
    return (
        <Canvas>
            {/* Lights */}
            <directionalLight intensity={3} position={[0, 3, 2]}/>

            {/* Environment */}
            <Environment preset={"city"}/>

            {/* Model */}
            <Model/>

            {/* Text behind the model */}

        </Canvas>
    );
}
