"use client";

import {SignUpButton, useUser} from "@clerk/nextjs";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle,} from "@/components/ui/card";
import {ArrowRight, CheckSquare, Shield, Users, Zap,} from "lucide-react";
import Navbar from "@/components/navbar";
import Scene from "@/components/Scene";
import Particles from "@/components/particles";

export default function HomePage() {
    const {isSignedIn, user} = useUser();


    const features = [
        {
            icon: CheckSquare,
            title: "Task Management",
            description: "Organize your tasks with intuitive drag-and-drop boards",
        },
        {
            icon: Users,
            title: "Team Collaboration",
            description: "Work together with your team in real-time",
        },
        {
            icon: Zap,
            title: "Lightning Fast",
            description: "Built with Next.js 15 for optimal performance",
        },
        {
            icon: Shield,
            title: "Secure",
            description: "Enterprise-grade security with Clerk authentication",
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-r
    from-black
    via-slate-900
    to-black">
            <Navbar/>

            {/* Hero Section */}
            <main className={"relative h-screen"}>
                <Scene/>
                <p
                    className={"gap-4 p-4 border-1 rounded-md  text-white absolute top-1/2 left-9 transform translate-y-9 w-60 break-words overflow-hidden sm:w-64 sm:translate-y-45 lg:w-64 md:w-50 "}>
                    Rhodie is a collaborative task management platform that integrates modern industry standard tools to
                    help
                    you seamlessly navigate your busy day to day.
                </p>
            </main>
            <div>
                <Particles/>
            </div>

            {!isSignedIn && (
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <SignUpButton>
                        <Button size="lg" className="text-lg px-8 hover:text-orange-200 hover:-translate-y-1">
                            Start for free
                            <ArrowRight className="ml-2 h-5 w-5"/>
                        </Button>
                    </SignUpButton>
                    <Button variant="outline" size="lg"
                            className="hover:bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200 hover:-translate-y-1 text-lg px-8">
                        Watch demo
                    </Button>
                </div>
            )}
            {/* Features Section */}
            <section className="container mx-auto px-4 py-20">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-300 mb-4">
                        Everything you need to stay organized
                    </h2>
                    <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                        All the powerful features we provide for seamless collabs.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {features.map((feature, index) => (
                        <Card
                            key={index}
                            className="card-glow border-0 shadow-lg hover:shadow-xl transition-shadow hover:translate-1"
                        >
                            <CardHeader className="text-center">
                                <div
                                    className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                                    <feature.icon className="h-6 w-6 text-blue-600"/>
                                </div>
                                <CardTitle className="text-lg">{feature.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription className="text-center">
                                    {feature.description}
                                </CardDescription>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="bg-gradient-to-b from-slate-900 via-black to-black py-20">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Ready to get your project on the Rhode?
                    </h2>
                    <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                        Join the many already using Rhodie and jump start your efficiency .
                    </p>

                    {!isSignedIn && (
                        <SignUpButton>
                            <Button size="lg" variant="secondary"
                                    className="text-lg px-8 hover:bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200">
                                Start your free trial
                                <ArrowRight className="ml-2 h-5 w-5"/>
                            </Button>
                        </SignUpButton>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className=" bg-gradient-to-b from-black via-black to-black  text-white py-12">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="flex items-center space-x-2 mb-4 md:mb-0">
                            <span className="text-sm font-bold border-1 rounded-md p-1">Rh</span>
                            <span className="text-xl font-bold">Rhodie</span>
                        </div>
                        <div className="flex items-center space-x-6 text-sm text-gray-400">
                            <span>© 2025 Rhodie. All rights reserved.</span>
                            <span>Built with Next.js & Clerk</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}