

export const PlaceholderPage = ({ title }: { title: string }) => {
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <div className="mt-8 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                <h3 className="mt-2 text-sm font-semibold text-gray-900">Work in Progress</h3>
                <p className="mt-1 text-sm text-gray-500">This compliance tracker is coming soon.</p>
            </div>
        </div>
    );
};

export const Dashboard = () => {
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-900">Risks Dashboard</h1>
            <div className="mt-8">
                <p className="text-gray-500">Global risk view not implemented yet.</p>
            </div>
        </div>
    )
}
