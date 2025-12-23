import {useRef} from "react"
import {useFrame, useThree} from "@react-three/fiber"
import {MeshTransmissionMaterial, Text, useGLTF} from "@react-three/drei"
import {useControls} from "leva"
import * as THREE from "three"

type GLTFResult = {
    nodes: {
        Torus: THREE.Mesh
    }
    materials: any
}

export default function Model() {
    const torus = useRef<THREE.Mesh>(null!)
    const {nodes} = useGLTF("/medias/torus.glb") as GLTFResult

    // Leva controls for transparent glass material
    const materialProps = useControls({
        thickness: {value: 0.25, min: 0, max: 3, step: 0.05},
        roughness: {value: 0, min: 0, max: 1, step: 0.1},
        transmission: {value: 1, min: 0, max: 1, step: 0.1},
        ior: {value: 1.0, min: 0, max: 3, step: 0.1},
        chromaticAberration: {value: 0.39, min: 0, max: 1},
        backside: {value: true},
    })

    // Rotate torus each frame
    useFrame((_, delta) => {
        if (torus.current) {
            torus.current.rotation.y += delta * 2
            torus.current.rotation.x += delta * 1.5
        }
    })

    const {viewport} = useThree()

    return (
        <group scale={viewport.width / 15}>
            {/* Text behind the torus */}
            <Text
                position={[0, 1, -2]} // Z negative = behind torus
                fontSize={0.9}
                color="gray"
                anchorX="center"
                anchorY=".07"
                material-toneMapped={false} // ensures visibility through glass
                renderOrder={-1} // render text before torus to see through transparent material
            >
                Welcome to Rhodie
            </Text>

            {/* Transparent Torus */}
            <mesh ref={torus} geometry={nodes.Torus.geometry}>
                <MeshTransmissionMaterial {...materialProps} />
            </mesh>
        </group>
    )
}
