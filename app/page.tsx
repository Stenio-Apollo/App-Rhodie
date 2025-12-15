"use client";

import {SignUpButton, useUser} from "@clerk/nextjs";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle,} from "@/components/ui/card";
import {ArrowRight, CheckSquare, Shield, Users, Zap,} from "lucide-react";
import Navbar from "@/components/navbar";

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
    from-orange-50
    via-orange-100
    to-orange-100">
            <Navbar/>

            {/* Hero Section */}
            <section className="container mx-auto px-4 py-20 text-center">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                        Structure your day with {" "}
                        <span className="text-rose-300">Rhodie.</span>
                    </h1>
                    <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                        Rhodie is the next generation of task management and productivity. It has built in features and
                        and functionality that allows for easy collaborations and project updates. It is a great way to
                        allow team members to input tasks
                        they are working on and update the status of said tasks. With our powerful event tools, you can
                        also add events to your boards and have them show up on your calendar.
                        whether you are working on a project with a team or just want to map out your day, Rhodie's got
                        you covered. Lets get this show on the Rhodie

                    </p>

                    {!isSignedIn && (
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <SignUpButton>
                                <Button size="lg"
                                        className="text-lg px-8 hover:-translate-y-1 hover:text-orange-100">
                                    Start for free
                                    <ArrowRight className="ml-2 h-5 w-5"/>
                                </Button>
                            </SignUpButton>
                            <Button variant="outline" size="lg"
                                    className="text-lg px-8 hover:bg-rose-50 hover:text-black hover:-translate-y-1">
                                Watch demo
                            </Button>
                        </div>
                    )}
                </div>
            </section>

            {/* Features Section */}
            <section className="container mx-auto px-4 py-20">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                        Everything you need to stay organized
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Hover below to reveal the powerful features we provide for seamless collabs.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {features.map((feature, index) => (
                        <Card
                            key={index}
                            className=" blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow hover:translate-1 hover:blur-none"
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
            <section className="bg-gradient-to-b from-orange-200 via-black to-black py-20">
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