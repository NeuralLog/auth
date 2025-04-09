from setuptools import setup, find_packages

setup(
    name="neurallog-auth-client",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "requests>=2.25.0",
        "cachetools>=4.2.0",
    ],
    author="NeuralLog Team",
    author_email="info@neurallog.com",
    description="Client SDK for NeuralLog Auth Service",
    keywords="neurallog, auth, client, sdk",
    url="https://github.com/your-org/neurallog-auth",
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
    ],
    python_requires=">=3.7",
)
