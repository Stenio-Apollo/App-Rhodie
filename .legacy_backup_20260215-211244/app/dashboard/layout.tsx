import {PlanProvider} from "@/lib/contexts/PlanContext";
import {auth} from "@clerk/nextjs/server";
import {React} from "next/dist/server/route-modules/app-page/vendored/rsc/entrypoints";

export default async function DashboardLayout({
                                                  children,
                                              }: {
    children: React.ReactNode;
}) {
    const {has} = await auth();
    const hasProPlan = has({plan: "pro_user"});
    const hasEnterprisePlan = has({plan: "enterprise_user"});

    return (
        <PlanProvider hasProPlan={hasProPlan} hasEnterprisePlan={hasEnterprisePlan}>
            {children}
        </PlanProvider>
    );
}